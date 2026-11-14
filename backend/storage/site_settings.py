"""Admin-editable site settings, stored as JSON values in the `metadata` table.

Every setting has a declared default and type here; unknown keys are rejected so
the table can't accumulate junk, and a missing row simply means "use the default".
"""

import json

from backend.storage.database import get_db
from backend.storage.base import _ensure_db

_KEY_PREFIX = "setting."

# name -> default. The default's type is the setting's type.
SITE_SETTING_DEFAULTS: dict = {
    # Show "N 次阅读" to everyone. When False only admins see article view counts.
    "view_counts_public": False,
}


def get_site_settings() -> dict:
    _ensure_db()
    settings = dict(SITE_SETTING_DEFAULTS)
    with get_db() as conn:
        rows = conn.execute(
            "SELECT key, value FROM metadata WHERE key LIKE ?", (_KEY_PREFIX + "%",)
        ).fetchall()
    for row in rows:
        name = row["key"][len(_KEY_PREFIX):]
        if name not in SITE_SETTING_DEFAULTS:
            continue
        try:
            value = json.loads(row["value"])
        except (TypeError, ValueError):
            continue
        if isinstance(value, type(SITE_SETTING_DEFAULTS[name])):
            settings[name] = value
    return settings


def update_site_settings(changes: dict) -> dict:
    """Validate and persist `changes`; returns the full settings afterwards.

    Raises ValueError on an unknown key or a value of the wrong type.
    """
    for name, value in changes.items():
        if name not in SITE_SETTING_DEFAULTS:
            raise ValueError(f"Unknown setting: {name}")
        expected = type(SITE_SETTING_DEFAULTS[name])
        # bool is a subclass of int; keep the check strict in both directions.
        if type(value) is not expected:
            raise ValueError(f"Setting {name} must be {expected.__name__}")
    _ensure_db()
    with get_db() as conn:
        for name, value in changes.items():
            conn.execute(
                "INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)",
                (_KEY_PREFIX + name, json.dumps(value)),
            )
    return get_site_settings()
