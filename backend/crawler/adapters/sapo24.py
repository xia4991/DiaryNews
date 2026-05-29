from backend.crawler.base import BaseAdapter


class Sapo24Adapter(BaseAdapter):
    name = "SAPO24"
    url = "https://24noticias.sapo.pt/rss"
