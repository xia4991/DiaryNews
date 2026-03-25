from collections import defaultdict

import streamlit as st

from backend.config import CATEGORIES, RSS_SOURCES


@st.dialog("Artigo", width="large")
def _show_article_detail(article: dict) -> None:
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


def render_news_tab(articles: list) -> None:
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
        return
    if not filtered:
        st.info("Nenhum artigo corresponde aos filtros seleccionados.")
        return

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
                        _show_article_detail(article)
                    st.caption(article["summary"][:180])
                    col_src2, col_date = st.columns([2, 1])
                    col_src2.markdown(f"`{article['source']}`")
                    col_date.markdown(
                        f"<div style='text-align:right;color:grey;font-size:0.8em'>{pub}</div>",
                        unsafe_allow_html=True,
                    )
