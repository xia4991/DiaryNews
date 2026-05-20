# Portugal News Compact Panel And Summary Fix

## Summary

Make the 葡萄牙新闻 top panel more compact and ensure article detail modals show
the article summary instead of hiding it when full Chinese content exists.

## Tasks

1. Reduce the Portugal news hero panel spacing, title scale, featured-card height,
   and side panel density.
2. Add a dedicated summary block in `ArticleModal` using Chinese summary first,
   then legacy AI summary, then RSS summary.
3. Keep full Chinese content and original article sections below the summary.
4. Run frontend build.
