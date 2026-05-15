from backend.crawler.base import BaseAdapter


class SicNoticiasAdapter(BaseAdapter):
    name = "SIC Notícias"
    # SIC retired its own /feed endpoint; the homepage's <link rel="alternate"> still points
    # to the Impresa RSS service, which serves the same content.
    url = (
        "https://rss.impresa.pt/feed/latest/sicnot.rss"
        "?type=ARTICLE,VIDEO,GALLERY,STREAM,PLAYLIST,EVENT,NEWSLETTER"
        "&limit=20&pubsubhub=true"
    )
