import os

from dotenv import load_dotenv

load_dotenv()

DB_PATH = "data/diarynews.db"
MAX_ARTICLES = 200
MAX_VIDEOS = 100

MINIMAX_API_URL = "https://api.minimaxi.com/v1/chat/completions"
MINIMAX_MODEL = "MiniMax-Text-01"

ENABLE_WHISPER_API   = os.environ.get("ENABLE_WHISPER_API", "false").lower() == "true"
ENABLE_WHISPER_LOCAL = os.environ.get("ENABLE_WHISPER_LOCAL", "false").lower() == "true"
WHISPER_MODEL        = os.environ.get("WHISPER_MODEL", "base")

RSS_SOURCES = {
    "RTP":                "https://www.rtp.pt/noticias/rss",
    "Observador":         "https://observador.pt/feed/",
    "SIC Notícias":       "https://sicnoticias.pt/feed",
    "TVI24":              "https://tvi24.iol.pt/rss/ultimas",
    "Jornal de Notícias": "https://www.jn.pt/rss/",
    "Público":            "https://feeds.feedburner.com/PublicoRSS",
}

# Order matters — first match wins; Geral is catch-all
CATEGORIES = [
    ("Política",      ["presidente", "governo", "parlamento", "ministro", "eleições", "partido", "república", "lei", "decreto"]),
    ("Desporto",      ["futebol", "sporting", "benfica", "porto", "golo", "jogador", "treinador", "liga", "bola", "equipa"]),
    ("Economia",      ["economia", "mercado", "empresa", "bolsa", "inflação", "exportação", "pib", "emprego", "banco", "euro"]),
    ("Saúde",         ["saúde", "hospital", "doença", "vacina", "médico", "sns", "pandemia", "vírus", "medicamento"]),
    ("Tecnologia",    ["tecnologia", "digital", "inteligência artificial", "startup", "app", "software", "internet"]),
    ("Internacional", ["guerra", "ucrânia", "europa", "eua", "mundo", "nato", "onu", "acordo", "cimeira"]),
    ("Cultura",       ["festival", "música", "cinema", "exposição", "livro", "arte", "teatro", "museu"]),
    ("Ambiente",      ["clima", "ambiente", "incêndio", "seca", "energia", "sustentável", "floresta"]),
    ("Crime/Justiça", ["crime", "polícia", "tribunal", "julgamento", "preso", "corrupção", "investigação", "detido"]),
    ("Sociedade",     ["educação", "família", "habitação", "jovens", "imigração", "pobreza", "social"]),
]
