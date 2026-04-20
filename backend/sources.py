"""Domain data: content sources and classification rules."""

RSS_SOURCES = {
    "RTP":                "https://www.rtp.pt/noticias/rss",
    "Observador":         "https://observador.pt/feed/",
    "SIC Notícias":       "https://sicnoticias.pt/feed",
    "TVI24":              "https://tvi24.iol.pt/rss/ultimas",
    "Jornal de Notícias": "https://www.jn.pt/rss/",
    "Público":            "https://feeds.feedburner.com/PublicoRSS",
    "Diário de Notícias": "https://www.dn.pt/rss/",
    "Expresso":           "https://expresso.pt/rss",
    "ECO":                "https://eco.sapo.pt/feed/",
}

SOURCE_PRIORITY = {
    "Público": 1, "Expresso": 2, "Observador": 3, "Diário de Notícias": 4,
    "RTP": 5, "ECO": 6, "SIC Notícias": 7, "Jornal de Notícias": 8, "TVI24": 9,
}

# Keyword fallback for Chinese-interest tags when LLM returns empty tags_zh
CN_TAG_KEYWORDS = {
    "移民签证": ["imigração", "imigrante", "visto", "visa", "residência",
                  "golden visa", "nómada digital", "refugiado", "asilo",
                  "fronteira", "sef", "aima", "autorização"],
    "房产租房": ["habitação", "arrendamento", "renda", "imobiliário",
                  "hipoteca", "senhorio", "inquilino", "alojamento",
                  "apartamento"],
    "法律法规": ["legislação", "regulamento", "decreto-lei", "diário da república",
                  "constitucional", "juridic"],
    "工作就业": ["emprego", "desemprego", "salário", "trabalhador", "contrato",
                  "recrutamento", "greve", "sindicato", "laboral"],
    "教育留学": ["universidade", "estudante", "bolsa de estudo", "ensino",
                  "escolar", "erasmus", "matrícula"],
    "税务财务": ["imposto", "irs", "iva", "finanças", "fiscal", "tributário",
                  "contribuinte", "fatura"],
    "华人社区": ["chinês", "chinesa", "comunidade chinesa", "asiático",
                  "china", "pequim", "beijing"],
    "安全治安": ["assalto", "roubo", "furto", "violência", "homicídio",
                  "segurança pública", "agressão"],
    "医疗社保": ["sns", "centro de saúde", "segurança social", "reforma",
                  "pensão", "medicamento", "consulta", "urgência"],
    "中葡关系": ["relações china", "bilateral", "diplomacia china",
                  "embaixada china", "cônsul"],
}

CN_RELEVANT_CATEGORIES = {"Sociedade", "Economia", "Internacional"}

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
