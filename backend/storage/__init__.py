# Re-export all public functions for backward compatibility.
# Consumers can continue to use: from backend import storage; storage.load_news()

from backend.storage.news import (  # noqa: F401
    load_news,
    save_news,
    merge_articles,
    increment_article_view,
    save_raw_articles,
    list_pending_enrichment,
    mark_enrichment_status,
    get_article_stats,
    list_recent_articles,
)
from backend.storage.health import upsert_source_health, load_source_health  # noqa: F401
from backend.storage.news_briefs import (  # noqa: F401
    BRIEF_TYPES,
    list_daily_news_briefs,
    get_daily_news_brief,
    upsert_daily_news_brief,
)
from backend.storage.announcements import (  # noqa: F401
    ANNOUNCEMENT_STATUSES,
    list_announcements,
    get_announcement,
    create_announcement,
    update_announcement,
    delete_announcement,
)
from backend.storage.community import (  # noqa: F401
    EVENT_CATEGORIES,
    POST_CATEGORIES,
    COMMUNITY_STATUSES,
    create_event,
    list_events,
    get_event,
    update_event,
    delete_event,
    create_post,
    list_posts,
    get_post,
    update_post,
    delete_post,
    list_post_replies,
    create_post_reply,
    delete_post_reply,
)
from backend.storage.users import (  # noqa: F401
    get_or_create_user,
    get_user_by_id,
    export_user_data,
    delete_user,
    update_user_profile,
)
from backend.storage.admin_logs import add_log, list_logs  # noqa: F401
from backend.storage.listings import (  # noqa: F401
    create_listing,
    get_listing,
    list_listings,
    list_all_recent,
    update_listing,
    delete_listing,
    set_listing_status,
    create_job,
    update_job,
    list_jobs,
    expire_stale_listings,
    JOB_INDUSTRIES,
    create_realestate,
    update_realestate,
    list_realestate,
    RE_DEAL_TYPES,
    create_secondhand,
    update_secondhand,
    list_secondhand,
    SH_CATEGORIES,
    SH_CONDITIONS,
    create_report,
    list_unresolved_reports,
    resolve_report,
    resolve_reports_for_listing,
)
