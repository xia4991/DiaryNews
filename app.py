import logging
import os
from collections import defaultdict
from datetime import datetime, timezone

import streamlit as st
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.WARNING, format="%(levelname)s %(name)s: %(message)s")
logging.getLogger("urllib3").setLevel(logging.ERROR)

from config import CATEGORIES, ENABLE_WHISPER_API, ENABLE_WHISPER_LOCAL, RSS_SOURCES, WHISPER_MODEL
from news import fetch_all_feeds, merge_articles
from storage import load_news, load_youtube, save_news, save_youtube
from youtube import (
    _normalise_handle,
    fetch_all_channels,
    fetch_caption,
    merge_videos,
    resolve_youtube_channel,
)

st.set_page_config(page_title="Notícias Portugal", page_icon="📰", layout="wide")
st.title("📰 Notícias Portugal")

data = load_news()
articles = data.get("articles", [])
last_updated = data.get("last_updated")

if not os.environ.get("MINIMAX_API_KEY"):
    st.warning("MINIMAX_API_KEY não configurada — resumos IA desactivados, será usado o resumo RSS.", icon="⚠️")

with st.sidebar:
    st.header("Controlos")
    if last_updated:
        st.caption(f"Última actualização: {last_updated[:19].replace('T', ' ')}")
    else:
        st.caption("Nunca actualizado")

    if st.button("🔄 Fetch latest news", use_container_width=True):
        with st.spinner("A carregar notícias..."):
            existing_urls = {a["link"] for a in articles}
            new_articles = fetch_all_feeds(existing_urls=existing_urls)
        articles = merge_articles(articles, new_articles)
        now_str = datetime.now(timezone.utc).isoformat()
        save_news({"last_updated": now_str, "articles": articles})
        st.success(f"{len(new_articles)} artigos obtidos.")
        st.rerun()

    st.divider()
    st.subheader("Fontes")
    selected_sources = [src for src in RSS_SOURCES if st.checkbox(src, value=True, key=f"src_{src}")]

    st.divider()
    st.subheader("Categoria")
    all_categories = ["Todas"] + sorted({a["category"] for a in articles})
    selected_category = st.selectbox("Filtrar", all_categories)

    st.divider()
    with st.expander("⚙️ Legendas"):
        st.caption("Tier 1 (youtube-transcript-api) está sempre activo.")
        st.caption(f"Tier 2 (Whisper API): {'✅ activo' if ENABLE_WHISPER_API else '❌ desactivado'}")
        st.caption(f"Tier 3 (Whisper local [{WHISPER_MODEL}]): {'✅ activo' if ENABLE_WHISPER_LOCAL else '❌ desactivado'}")
        st.caption("Para activar, edite o ficheiro `.env`.")

filtered = [
    a for a in articles
    if a["source"] in selected_sources
    and (selected_category == "Todas" or a["category"] == selected_category)
]


@st.dialog("Resumo do Artigo", width="large")
def show_article_detail(article: dict) -> None:
    st.subheader(article["title"])
    st.caption(f"{article['source']}  ·  {article['published'][:16].replace('T', ' ')}")
    st.divider()
    st.markdown(f"**Resumo IA**\n\n{article.get('ai_summary', article['summary'])}")
    full_text = article.get("scraped_content", "")
    if full_text:
        st.divider()
        st.markdown("**Artigo completo**")
        st.markdown(full_text)
    st.divider()
    st.link_button("Ler artigo original →", article["link"], use_container_width=True)


@st.dialog("Legenda do Vídeo", width="large")
def show_caption_dialog(video: dict) -> None:
    st.subheader(video["title"])
    st.caption(f"{video['channel_name']}  ·  {video['published'][:16].replace('T', ' ')}")
    st.divider()

    caption = video.get("caption")

    if caption is None:
        st.warning("Legendas indisponíveis para este vídeo.")
        if st.button("🔄 Tentar novamente"):
            _clear_caption(video["video_id"])
            st.rerun()
        return

    if not caption:
        with st.spinner("A obter legendas..."):
            try:
                result = fetch_caption(video["video_id"])
                _save_caption(video["video_id"], result)
                caption = result
            except ValueError as exc:
                st.error(str(exc))
                _save_caption(video["video_id"], None)
                return

    tier_label = {1: "YouTube captions", 2: "Whisper API", 3: "Whisper local"}.get(caption.get("tier", 1))
    st.caption(f"Idioma: `{caption['language']}`  ·  {tier_label}  ·  {caption['fetched_at'][:16].replace('T', ' ')}")
    st.text_area("Texto", caption["text"], height=400, disabled=True)
    if st.button("🔄 Re-fetch"):
        _clear_caption(video["video_id"])
        st.rerun()


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


def _render_youtube_tab() -> None:
    yt_data = load_youtube()
    channels = yt_data.get("channels", [])
    videos   = yt_data.get("videos", [])
    yt_last  = yt_data.get("last_updated")

    with st.expander("Gerir canais", expanded=not channels):
        with st.form("add_yt_channel", clear_on_submit=True):
            raw_input = st.text_input("Adicionar canal", placeholder="@mkbhd  ou  youtube.com/@mkbhd")
            submitted = st.form_submit_button("Adicionar")
        if submitted and raw_input.strip():
            try:
                handle, _ = _normalise_handle(raw_input)
            except ValueError as exc:
                st.error(str(exc))
            else:
                if handle in {ch["handle"] for ch in channels}:
                    st.warning(f"{handle} já está na lista.")
                else:
                    yt_data["channels"].append({"handle": handle, "name": handle.lstrip("@"), "channel_id": None})
                    save_youtube(yt_data)
                    st.success(f"Canal adicionado: {handle}. Clique em 'Fetch latest videos' para carregar os vídeos.")
                    st.rerun()
        if channels:
            st.markdown("**Canais subscritos:**")
            for ch in channels:
                col_name, col_btn = st.columns([5, 1])
                col_name.markdown(f"[{ch['name']}](https://www.youtube.com/{ch['handle']}) `{ch['handle']}`")
                if col_btn.button("✕", key=f"rm_ch_{ch['handle']}"):
                    yt_data["channels"] = [c for c in yt_data["channels"] if c["handle"] != ch["handle"]]
                    if ch.get("channel_id"):
                        yt_data["videos"] = [v for v in yt_data["videos"] if v["channel_id"] != ch["channel_id"]]
                    save_youtube(yt_data)
                    st.rerun()

    col_btn, col_ts = st.columns([2, 5])
    with col_btn:
        fetch_clicked = st.button("🔄 Fetch latest videos", use_container_width=True, disabled=not channels)
    with col_ts:
        if yt_last:
            st.caption(f"Última actualização: {yt_last[:19].replace('T', ' ')}")

    if fetch_clicked and channels:
        needs_resolve = [ch for ch in channels if not ch.get("channel_id")]
        if needs_resolve:
            for ch in needs_resolve:
                with st.spinner(f"A resolver {ch['handle']}..."):
                    try:
                        resolved = resolve_youtube_channel(ch["handle"])
                        ch["channel_id"] = resolved["channel_id"]
                        ch["name"] = resolved["name"]
                        st.write(f"✅ {ch['handle']} → `{ch['channel_id']}`")
                    except Exception as exc:
                        st.error(f"Não foi possível resolver {ch['handle']}: {exc}")
            save_youtube(yt_data)

        fetchable = [ch for ch in channels if ch.get("channel_id")]
        if not fetchable:
            st.error("Nenhum canal pôde ser resolvido. Verifique o handle e tente novamente.")
            return

        existing_ids = {v["video_id"] for v in videos}
        with st.spinner("A carregar vídeos..."):
            new_videos = fetch_all_channels(fetchable, existing_ids)
        if not new_videos:
            st.warning("Nenhum vídeo novo encontrado. O feed pode estar vazio ou os vídeos já foram carregados.")
        else:
            videos = merge_videos(videos, new_videos)
            yt_data["videos"] = videos
            yt_data["last_updated"] = datetime.now(timezone.utc).isoformat()
            save_youtube(yt_data)
            st.success(f"{len(new_videos)} vídeos novos obtidos.")
            st.rerun()

    if not channels:
        st.info("Adicione um canal acima para começar.")
        return
    if not videos:
        st.info("Sem vídeos. Clique em 'Fetch latest videos'.")
        return

    cols = st.columns(3)
    for i, video in enumerate(videos):
        with cols[i % 3]:
            with st.container(border=True):
                st.image(video["thumbnail"], use_container_width=True)
                st.markdown(f"**[{video['title']}]({video['link']})**")
                pub = video["published"][:16].replace("T", " ")
                st.caption(f"{video['channel_name']}  ·  {pub}")
                cap = video.get("caption")
                cap_label = "✅ Legenda" if cap else ("⚠️ Sem legenda" if cap is None else "📄 Legenda")
                if st.button(cap_label, key=f"cap_{video['video_id']}", use_container_width=True):
                    show_caption_dialog(video)


tab_news, tab_yt = st.tabs(["📰 Notícias", "▶️ YouTube"])

with tab_news:
    if not filtered:
        st.info("Sem artigos. Clique em 'Fetch latest news' na barra lateral.")
    else:
        by_category = defaultdict(list)
        for a in filtered:
            by_category[a["category"]].append(a)

        ordered_cats = [c for c, _ in CATEGORIES] + ["Geral"]
        for cat in ordered_cats:
            if cat not in by_category:
                continue
            st.header(cat)
            cols = st.columns(3)
            for i, article in enumerate(by_category[cat]):
                with cols[i % 3]:
                    pub = article["published"][:16].replace("T", " ")
                    with st.container(border=True):
                        if st.button(article["title"], key=f"btn_{article['link']}", use_container_width=True):
                            show_article_detail(article)
                        st.caption(article["summary"][:200])
                        col_src, col_date = st.columns([2, 1])
                        col_src.markdown(f"`{article['source']}`")
                        col_date.markdown(f"<div style='text-align:right'>{pub}</div>", unsafe_allow_html=True)

with tab_yt:
    _render_youtube_tab()
