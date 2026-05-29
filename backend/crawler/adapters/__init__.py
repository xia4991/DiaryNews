"""Registry of all per-source adapters."""

from backend.crawler.adapters.diario_noticias import DiarioNoticiasAdapter
from backend.crawler.adapters.eco import ECOAdapter
from backend.crawler.adapters.expresso import ExpressoAdapter
from backend.crawler.adapters.observador import ObservadorAdapter
from backend.crawler.adapters.publico import PublicoAdapter
from backend.crawler.adapters.rtp import RTPAdapter
from backend.crawler.adapters.sapo24 import Sapo24Adapter
from backend.crawler.adapters.sic_noticias import SicNoticiasAdapter

ADAPTER_CLASSES = [
    RTPAdapter,
    ObservadorAdapter,
    SicNoticiasAdapter,
    PublicoAdapter,
    DiarioNoticiasAdapter,
    ExpressoAdapter,
    ECOAdapter,
    Sapo24Adapter,
]


def load_all_adapters() -> list:
    return [cls() for cls in ADAPTER_CLASSES]
