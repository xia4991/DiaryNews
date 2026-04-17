from abc import ABC, abstractmethod


class MediaStorage(ABC):
    """Storage backend for binary media (images). Backed by local disk or S3."""

    @abstractmethod
    def store(self, data: bytes, directory: str, ext: str) -> str:
        """Persist bytes and return an opaque storage key.

        directory: logical namespace, e.g. 'listings' or 'avatars'.
        ext: file extension without dot, e.g. 'jpg'.
        """

    @abstractmethod
    def url(self, key: str) -> str:
        """Return a URL the browser can GET to fetch the stored object."""

    @abstractmethod
    def delete(self, key: str) -> None:
        """Remove the object at `key`. No-op if missing."""
