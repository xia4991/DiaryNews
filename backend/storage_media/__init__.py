"""Media storage abstraction. Backend selected by `MEDIA_BACKEND` env var."""

from functools import lru_cache

from backend.config import MEDIA_BACKEND, MEDIA_LOCAL_ROOT, MEDIA_PUBLIC_URL
from backend.storage_media.base import MediaStorage
from backend.storage_media.local import LocalMediaStorage
from backend.storage_media.s3 import S3MediaStorage


@lru_cache(maxsize=1)
def get_media_storage() -> MediaStorage:
    if MEDIA_BACKEND == "local":
        return LocalMediaStorage(root=MEDIA_LOCAL_ROOT, public_url=MEDIA_PUBLIC_URL)
    if MEDIA_BACKEND == "s3":
        return S3MediaStorage()
    raise ValueError(f"Unknown MEDIA_BACKEND: {MEDIA_BACKEND!r}")


__all__ = ["MediaStorage", "get_media_storage"]
