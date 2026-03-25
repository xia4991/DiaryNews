import logging
import os
from datetime import datetime, timezone

import streamlit as st

logging.basicConfig(level=logging.WARNING, format="%(levelname)s %(name)s: %(message)s")
logging.getLogger("urllib3").setLevel(logging.ERROR)

from backend.news import fetch_all_feeds
from backend.storage import load_news, load_youtube, save_news
from frontend.news import render_news_tab
from frontend.youtube import render_youtube_tab

st.set_page_config(page_title="DiaryNews", page_icon="📰", layout="wide")


@st.cache_data(ttl=300)
def _cached_news() -> dict:
    return load_news()


data = _cached_news()
articles = data.get("articles", [])
news_last = data.get("last_updated")
yt_last = load_youtube().get("last_updated")

# ── Sidebar ───────────────────────────────────────────────────────────────────
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
        now_str = datetime.now(timezone.utc).isoformat()
        save_news({"last_updated": now_str, "articles": new_articles})
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

# ── Tabs ──────────────────────────────────────────────────────────────────────
tab_news, tab_yt = st.tabs(["📰 Notícias", "▶️ YouTube"])

with tab_news:
    render_news_tab(articles)

with tab_yt:
    render_youtube_tab()
