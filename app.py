import logging
import os
from collections import defaultdict
from datetime import datetime, timezone

import streamlit as st

logging.basicConfig(level=logging.WARNING, format="%(levelname)s %(name)s: %(message)s")
logging.getLogger("urllib3").setLevel(logging.ERROR)

from config import CATEGORIES, ENABLE_WHISPER_API, ENABLE_WHISPER_LOCAL, RSS_SOURCES, WHISPER_MODEL
from news import fetch_all_feeds, merge_articles
from storage import load_news, load_youtube, save_news, save_youtube
from youtube import (
    normalise_handle,
    fetch_all_channels,
    fetch_caption,
    merge_videos,
    resolve_youtube_channel,
    summarize_caption,
)

st.set_page_config(page_title="DiaryNews", page_icon="📰", layout="wide")


@st.cache_data(ttl=300)
def _cached_news() -> dict:
    return load_news()


data = _cached_news()
articles = data.get("articles", [])
news_last = data.get("last_updated")
yt_data_sidebar = load_youtube()
yt_last = yt_data_sidebar.get("last_updated")

# ── Sidebar ──────────────────────────────────────────────────────────────────
with st.sidebar:
    st.title("📰 DiaryNews")
    st.divider()

    st.subheader("📰 Notícias")
    if news_last:
        st.caption(f"Actualizado: {news_last[:16].replace('T', ' ')}")
    if st.button("🔄 Buscar notícias", width="stretch"):
        with st.spinner("A carregar..."):
            existing_urls = {a["link"] for a in articles}
            new_articles = fetch_all_feeds(existing_urls=existing_urls)
        articles = merge_articles(articles, new_articles)
        now_str = datetime.now(timezone.utc).isoformat()
        save_news({"last_updated": now_str, "articles": articles})
        _cached_news.clear()
        st.success(f"{len(new_articles)} novos artigos.")
        st.rerun()

    st.divider()

    st.subheader("▶️ YouTube")
    if yt_last:
        st.caption(f"Actualizado: {yt_last[:16].replace('T', ' ')}")
    if st.button("🔄 Buscar vídeos", width="stretch"):
        st.session_state["yt_fetch_triggered"] = True
        st.rerun()

    st.divider()
    if not os.environ.get("MINIMAX_API_KEY"):
        st.caption("⚠️ MINIMAX_API_KEY não configurada — resumos IA desactivados.")


# ── Dialogs ───────────────────────────────────────────────────────────────────
@st.dialog("Artigo", width="large")
def show_article_detail(article: dict) -> None:
    st.subheader(article["title"])
    st.caption(f"{article['source']}  ·  {article['published'][:16].replace('T', ' ')}")
    st.divider()
    st.markdown(article.get("ai_summary", article["summary"]))
    full_text = article.get("scraped_content", "")
    if full_text:
        with st.expander("📄 Artigo completo"):
            st.markdown(full_text)
    st.divider()
    st.link_button("Ler artigo original →", article["link"], width="stretch")


@st.dialog("Legenda do Vídeo", width="large")
def show_caption_dialog(video: dict) -> None:
    st.subheader(video["title"])
    st.caption(f"{video['channel_name']}  ·  {video['published'][:16].replace('T', ' ')}")
    st.divider()

    attempted = "caption" in video
    caption = video.get("caption")

    if attempted and caption is None:
        st.warning("Legendas indisponíveis para este vídeo.")
        if st.button("🔄 Tentar novamente"):
            _clear_caption(video["video_id"])
            st.rerun()
        return

    if not attempted:
        with st.spinner("A obter legendas..."):
            try:
                result = fetch_caption(video["video_id"])
            except ValueError as exc:
                st.error(str(exc))
                _save_caption(video["video_id"], None)
                return
        with st.spinner("A gerar resumo com IA..."):
            result["summary"] = summarize_caption(video["title"], result["text"])
        _save_caption(video["video_id"], result)
        caption = result

    tier_label = {1: "YouTube captions", 2: "Whisper API", 3: "Whisper local"}.get(caption.get("tier", 1))
    st.caption(f"`{caption['language']}`  ·  {tier_label}  ·  {caption['fetched_at'][:16].replace('T', ' ')}")

    summary = caption.get("summary", "")
    if summary:
        st.markdown(summary)
    else:
        st.info("Resumo IA não disponível (MINIMAX_API_KEY não configurada).")

    with st.expander("📄 Transcrição bruta"):
        st.text_area("", caption["text"], height=300, disabled=True, label_visibility="collapsed")

    st.divider()
    if st.button("🔄 Re-fetch", width="stretch"):
        _clear_caption(video["video_id"])
        st.rerun()


# ── Caption helpers ───────────────────────────────────────────────────────────
def _save_caption(video_id: str, caption) -> None:
    yt_data = load_youtube()
    for v in yt_data["videos"]:
        if v["video_id"] == video_id:
            v["caption"] = caption
            break
    save_youtube(yt_data)


def _clear_caption(video_id: str) -> None:
    yt_data = load_youtube()
    for v in yt_data["videos"]:
        if v["video_id"] == video_id:
            v.pop("caption", None)
            break
    save_youtube(yt_data)


# ── Tabs ──────────────────────────────────────────────────────────────────────
tab_news, tab_yt = st.tabs(["📰 Notícias", "▶️ YouTube"])


# ── News tab ──────────────────────────────────────────────────────────────────
with tab_news:
    # Inline filter bar
    all_sources = list(RSS_SOURCES.keys())
    all_categories = ["Todas"] + sorted({a["category"] for a in articles})

    col_src, col_cat = st.columns([3, 2])
    with col_src:
        selected_sources = st.multiselect(
            "Fontes", all_sources, default=all_sources, label_visibility="collapsed",
            placeholder="Filtrar por fonte..."
        )
    with col_cat:
        selected_category = st.selectbox(
            "Categoria", all_categories, label_visibility="collapsed"
        )

    if not selected_sources:
        selected_sources = all_sources

    filtered = [
        a for a in articles
        if a["source"] in selected_sources
        and (selected_category == "Todas" or a["category"] == selected_category)
    ]

    st.divider()

    if not articles:
        st.info("Sem artigos. Clique em **Buscar notícias** na barra lateral.")
    elif not filtered:
        st.info("Nenhum artigo corresponde aos filtros seleccionados.")
    else:
        by_category = defaultdict(list)
        for a in filtered:
            by_category[a["category"]].append(a)

        ordered_cats = [c for c, _ in CATEGORIES] + ["Geral"]
        for cat in ordered_cats:
            if cat not in by_category:
                continue
            st.subheader(cat)
            cols = st.columns(3)
            for i, article in enumerate(by_category[cat]):
                with cols[i % 3]:
                    pub = article["published"][:16].replace("T", " ")
                    with st.container(border=True):
                        if st.button(article["title"], key=f"btn_{article['link']}", width="stretch"):
                            show_article_detail(article)
                        st.caption(article["summary"][:180])
                        col_src2, col_date = st.columns([2, 1])
                        col_src2.markdown(f"`{article['source']}`")
                        col_date.markdown(
                            f"<div style='text-align:right;color:grey;font-size:0.8em'>{pub}</div>",
                            unsafe_allow_html=True,
                        )


# ── YouTube tab ───────────────────────────────────────────────────────────────
with tab_yt:
    yt_data = load_youtube()
    channels = yt_data.get("channels", [])
    videos = yt_data.get("videos", [])

    # Channel management — collapsed when channels already exist
    with st.expander("⚙️ Gerir canais", expanded=not channels):
        with st.form("add_yt_channel", clear_on_submit=True):
            col_input, col_btn = st.columns([5, 1])
            raw_input = col_input.text_input(
                "Canal", placeholder="@mkbhd  ou  youtube.com/@mkbhd", label_visibility="collapsed"
            )
            submitted = col_btn.form_submit_button("Adicionar", use_container_width=True)
        if submitted and raw_input.strip():
            try:
                handle, _ = normalise_handle(raw_input)
            except ValueError as exc:
                st.error(str(exc))
            else:
                if handle in {ch["handle"] for ch in channels}:
                    st.warning(f"{handle} já está na lista.")
                else:
                    yt_data["channels"].append({"handle": handle, "name": handle.lstrip("@"), "channel_id": None})
                    save_youtube(yt_data)
                    st.success(f"Canal adicionado: {handle}")
                    st.rerun()

        if channels:
            for ch in channels:
                col_name, col_rm = st.columns([6, 1])
                col_name.markdown(f"[{ch['name']}](https://www.youtube.com/{ch['handle']}) `{ch['handle']}`")
                if col_rm.button("✕", key=f"rm_ch_{ch['handle']}"):
                    yt_data["channels"] = [c for c in yt_data["channels"] if c["handle"] != ch["handle"]]
                    if ch.get("channel_id"):
                        yt_data["videos"] = [v for v in yt_data["videos"] if v["channel_id"] != ch["channel_id"]]
                    save_youtube(yt_data)
                    st.rerun()

    # Handle fetch triggered from sidebar button
    if st.session_state.pop("yt_fetch_triggered", False) and channels:
        needs_resolve = [ch for ch in channels if not ch.get("channel_id")]
        for ch in needs_resolve:
            with st.spinner(f"A resolver {ch['handle']}..."):
                try:
                    resolved = resolve_youtube_channel(ch["handle"])
                    ch["channel_id"] = resolved["channel_id"]
                    ch["name"] = resolved["name"]
                except Exception as exc:
                    st.error(f"Não foi possível resolver {ch['handle']}: {exc}")
        if needs_resolve:
            save_youtube(yt_data)

        fetchable = [ch for ch in channels if ch.get("channel_id")]
        if not fetchable:
            st.error("Nenhum canal pôde ser resolvido.")
        else:
            existing_ids = {v["video_id"] for v in videos}
            with st.spinner("A carregar vídeos..."):
                new_videos = fetch_all_channels(fetchable, existing_ids)
            if not new_videos:
                st.warning("Nenhum vídeo novo encontrado.")
            else:
                videos = merge_videos(videos, new_videos)
                yt_data["videos"] = videos
                yt_data["last_updated"] = datetime.now(timezone.utc).isoformat()
                save_youtube(yt_data)
                st.success(f"{len(new_videos)} vídeos novos obtidos.")
                st.rerun()

    if not channels:
        st.info("Adicione um canal acima para começar.")
    elif not videos:
        st.info("Clique em **Buscar vídeos** na barra lateral para carregar vídeos.")
    else:
        cols = st.columns(3)
        for i, video in enumerate(videos):
            with cols[i % 3]:
                with st.container(border=True):
                    st.image(video["thumbnail"], width="stretch")
                    st.markdown(f"**[{video['title']}]({video['link']})**")
                    pub = video["published"][:16].replace("T", " ")
                    st.caption(f"{video['channel_name']}  ·  {pub}")
                    cap = video.get("caption")
                    cap_label = (
                        "✅ Legenda" if cap
                        else ("⚠️ Sem legenda" if ("caption" in video and cap is None)
                              else "📄 Legenda")
                    )
                    if st.button(cap_label, key=f"cap_{video['video_id']}", width="stretch"):
                        show_caption_dialog(video)

    # Caption settings — at the bottom of the YouTube tab
    st.divider()
    with st.expander("⚙️ Configuração de legendas"):
        st.caption("**Tier 1** (youtube-transcript-api) — sempre activo")
        st.caption(f"**Tier 2** (Whisper API): {'✅ activo' if ENABLE_WHISPER_API else '❌ desactivado'}")
        st.caption(f"**Tier 3** (Whisper local `{WHISPER_MODEL}`): {'✅ activo' if ENABLE_WHISPER_LOCAL else '❌ desactivado'}")
        st.caption("Para activar, edite `.env` e reinicie a app.")
