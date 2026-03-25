import streamlit as st

from backend import storage
from backend.youtube import (
    fetch_and_summarize_caption,
    fetch_all_channels,
    merge_videos,
    normalise_handle,
    resolve_youtube_channel,
)


_CHANNEL_CATEGORIES = [
    "Tecnologia", "Desporto", "Manga/Anime", "Entretenimento",
    "Notícias", "Ciência", "Educação", "Música", "Jogos", "Outros",
]


@st.dialog("Legenda do Vídeo", width="large")
def _show_caption_dialog(video: dict) -> None:
    st.subheader(video["title"])
    st.caption(f"{video['channel_name']}  ·  {video['published'][:16].replace('T', ' ')}")
    st.divider()

    attempted = "caption" in video
    caption = video.get("caption")

    if attempted and caption is None:
        st.warning("Legendas indisponíveis para este vídeo.")
        if st.button("🔄 Tentar novamente"):
            storage.clear_caption(video["video_id"])
            st.rerun()
        return

    if not attempted:
        with st.spinner("A obter legendas e a gerar resumo..."):
            result = fetch_and_summarize_caption(video["video_id"], video["title"])
        storage.save_caption(video["video_id"], result)
        if result is None:
            st.warning("Legendas indisponíveis para este vídeo.")
            return
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
        storage.clear_caption(video["video_id"])
        st.rerun()


def _render_channel_manager(yt_data: dict) -> None:
    channels = yt_data.get("channels", [])
    with st.expander("⚙️ Gerir canais", expanded=not channels):
        with st.form("add_yt_channel", clear_on_submit=True):
            col_input, col_cat, col_btn = st.columns([4, 2, 1])
            raw_input = col_input.text_input(
                "Canal", placeholder="@mkbhd  ou  youtube.com/@mkbhd", label_visibility="collapsed"
            )
            category = col_cat.selectbox("Categoria", _CHANNEL_CATEGORIES, label_visibility="collapsed")
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
                    storage.add_channel(handle, handle.lstrip("@"), category)
                    st.success(f"Canal adicionado: {handle}")
                    st.rerun()

        if channels:
            for ch in channels:
                col_name, col_rm = st.columns([6, 1])
                col_name.markdown(
                    f"[{ch['name']}](https://www.youtube.com/{ch['handle']}) "
                    f"`{ch['handle']}` · `{ch.get('category', 'Outros')}`"
                )
                if col_rm.button("✕", key=f"rm_ch_{ch['handle']}"):
                    storage.remove_channel(ch["handle"])
                    st.rerun()


def _handle_fetch(yt_data: dict) -> None:
    channels = yt_data.get("channels", [])
    videos = yt_data.get("videos", [])

    needs_resolve = [ch for ch in channels if not ch.get("channel_id")]
    for ch in needs_resolve:
        with st.spinner(f"A resolver {ch['handle']}..."):
            try:
                resolved = resolve_youtube_channel(ch["handle"])
                storage.update_channel_id(ch["handle"], resolved["channel_id"], resolved["name"])
            except Exception as exc:
                st.error(f"Não foi possível resolver {ch['handle']}: {exc}")

    yt_data = storage.load_youtube()
    fetchable = [ch for ch in yt_data["channels"] if ch.get("channel_id")]
    if not fetchable:
        st.error("Nenhum canal pôde ser resolvido.")
        return

    existing_ids = {v["video_id"] for v in videos}
    with st.spinner("A carregar vídeos..."):
        new_videos = fetch_all_channels(fetchable, existing_ids)

    if not new_videos:
        st.warning("Nenhum vídeo novo encontrado.")
        return

    from datetime import datetime, timezone
    merged = merge_videos(yt_data["videos"], new_videos)
    storage.update_videos(merged, datetime.now(timezone.utc).isoformat())
    st.success(f"{len(new_videos)} vídeos novos obtidos.")
    st.rerun()


def _render_video_grid(videos: list) -> None:
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
                    _show_caption_dialog(video)


def _render_feed(videos: list, channels: list) -> None:
    cat_by_channel_id = {ch["channel_id"]: ch.get("category", "Outros") for ch in channels if ch.get("channel_id")}
    all_cats = sorted(set(ch.get("category", "Outros") for ch in channels))
    selected_cats = st.multiselect("Categorias", all_cats, default=all_cats, placeholder="Filtrar categorias...")

    feed_videos = [
        v for v in videos
        if cat_by_channel_id.get(v["channel_id"], "Outros") in selected_cats
    ]

    if not feed_videos:
        st.info("Nenhum vídeo nas categorias seleccionadas.")
        return

    feed_cols = st.columns(2)
    for i, video in enumerate(feed_videos):
        with feed_cols[i % 2]:
            with st.container(border=True):
                cat = cat_by_channel_id.get(video["channel_id"], "Outros")
                st.caption(f"`{video['channel_name']}` · `{cat}` · {video['published'][:10]}")
                st.markdown(f"**[{video['title']}]({video['link']})**")

                caption = video.get("caption")
                summary = (caption or {}).get("summary", "")

                if summary:
                    st.markdown(summary)
                elif "caption" not in video:
                    if st.button("📋 Gerar resumo", key=f"feed_gen_{video['video_id']}", use_container_width=True):
                        with st.spinner("A gerar resumo..."):
                            result = fetch_and_summarize_caption(video["video_id"], video["title"])
                            storage.save_caption(video["video_id"], result)
                        st.rerun()
                elif caption is None:
                    st.caption("⚠️ Legendas indisponíveis")
                else:
                    st.caption("_Resumo não disponível_")


def render_youtube_tab() -> None:
    yt_data = storage.load_youtube()
    channels = yt_data.get("channels", [])
    videos = yt_data.get("videos", [])

    _render_channel_manager(yt_data)

    if st.session_state.pop("yt_fetch_triggered", False) and channels:
        _handle_fetch(yt_data)

    if not channels:
        st.info("Adicione um canal acima para começar.")
    elif not videos:
        st.info("Clique em **Buscar vídeos** na barra lateral para carregar vídeos.")
    else:
        tab_grid, tab_feed = st.tabs(["🎬 Vídeos", "📋 Feed"])
        with tab_grid:
            _render_video_grid(videos)
        with tab_feed:
            _render_feed(videos, channels)

    # Caption settings
    from backend.config import ENABLE_WHISPER_API, ENABLE_WHISPER_LOCAL, WHISPER_MODEL
    st.divider()
    with st.expander("⚙️ Configuração de legendas"):
        st.caption("**Tier 1** (youtube-transcript-api) — sempre activo")
        st.caption(f"**Tier 2** (Whisper API): {'✅ activo' if ENABLE_WHISPER_API else '❌ desactivado'}")
        st.caption(f"**Tier 3** (Whisper local `{WHISPER_MODEL}`): {'✅ activo' if ENABLE_WHISPER_LOCAL else '❌ desactivado'}")
        st.caption("Para activar, edite `.env` e reinicie a app.")
