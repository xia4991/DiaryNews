"""Expresso — /rss retired; homepage now exposes the Impresa RSS service URL."""

from backend.crawler.base import BaseAdapter


class ExpressoAdapter(BaseAdapter):
    name = "Expresso"
    url = (
        "https://rss.impresa.pt/feed/latest/expresso.rss"
        "?type=ARTICLE,VIDEO,GALLERY,STREAM,PLAYLIST,EVENT,NEWSLETTER"
        "&limit=20&pubsubhub=true"
    )
