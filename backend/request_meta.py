"""Who is on the other end of a request: real client IP, device class, bot detection.

Production traffic arrives as cloudflared -> Caddy (:8080) -> uvicorn (:8000), so the
socket peer uvicorn sees is always 127.0.0.1. The visitor's address is in
`CF-Connecting-IP` (set by Cloudflare, passed through Caddy untouched).

Forwarding headers are only honoured when the socket peer is a trusted proxy
(loopback by default). A client connecting to the backend directly cannot spoof its
address by sending the header itself.
"""

import ipaddress
import re

from fastapi import Request

from backend.config import TRUSTED_PROXY_IPS

_BOT_RE = re.compile(
    r"bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|"
    r"curl|wget|python-requests|httpx|aiohttp|go-http-client|okhttp|java/|scrapy",
    re.IGNORECASE,
)
_TABLET_RE = re.compile(r"ipad|tablet|kindle|silk|(android(?!.*mobile))", re.IGNORECASE)
_MOBILE_RE = re.compile(r"mobi|iphone|ipod|android|windows phone|micromessenger", re.IGNORECASE)


def _valid_ip(value: str) -> str:
    value = (value or "").strip()
    if not value:
        return ""
    try:
        return str(ipaddress.ip_address(value))
    except ValueError:
        return ""


def client_ip(request: Request) -> str:
    peer = request.client.host if request.client else ""
    if peer in TRUSTED_PROXY_IPS:
        forwarded = _valid_ip(request.headers.get("cf-connecting-ip", ""))
        if forwarded:
            return forwarded
        xff = request.headers.get("x-forwarded-for", "")
        if xff:
            forwarded = _valid_ip(xff.split(",")[0])
            if forwarded:
                return forwarded
        forwarded = _valid_ip(request.headers.get("x-real-ip", ""))
        if forwarded:
            return forwarded
    return peer or "unknown"


def client_country(request: Request) -> str:
    """Two-letter country from Cloudflare's `CF-IPCountry`, when behind the tunnel."""
    peer = request.client.host if request.client else ""
    if peer not in TRUSTED_PROXY_IPS:
        return ""
    country = (request.headers.get("cf-ipcountry") or "").strip().upper()
    return country if re.fullmatch(r"[A-Z]{2}", country) and country not in ("XX", "T1") else ""


def is_bot(user_agent: str) -> bool:
    return not user_agent or bool(_BOT_RE.search(user_agent))


def device_type(user_agent: str) -> str:
    if not user_agent:
        return "unknown"
    if _TABLET_RE.search(user_agent):
        return "tablet"
    if _MOBILE_RE.search(user_agent):
        return "mobile"
    return "desktop"
