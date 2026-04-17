# Re-export all public functions for backward compatibility.
# Consumers can continue to use: from backend import storage; storage.load_news()

from backend.storage.news import load_news, save_news, merge_articles  # noqa: F401
from backend.storage.youtube import (  # noqa: F401
    load_youtube,
    save_youtube,
    update_videos,
    add_channel,
    remove_channel,
    update_channel_id,
    save_caption,
    clear_caption,
)
from backend.storage.ideas import (  # noqa: F401
    load_ideas,
    save_idea,
    update_idea,
    delete_idea,
)
from backend.storage.users import (  # noqa: F401
    get_or_create_user,
    get_user_by_id,
)
from backend.storage.listings import (  # noqa: F401
    create_listing,
    get_listing,
    list_listings,
    update_listing,
    delete_listing,
    set_listing_status,
    create_job,
    update_job,
    JOB_INDUSTRIES,
    create_report,
    list_unresolved_reports,
    resolve_report,
)
