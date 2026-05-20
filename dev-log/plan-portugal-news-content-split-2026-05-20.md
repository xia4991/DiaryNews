# Portugal News Content Split

## Summary

Split the 葡萄牙新闻 feed into articles with fuller content and short items that
only have title/summary. Keep fuller articles in 持续更新 and move short items to
the sidebar position currently used by 今日版面.

## Tasks

1. Add a frontend helper that detects detailed content by comparing `content_zh`
   length against summary text.
2. Filter Portugal `feed` into detailed articles and short summary-only items.
3. Replace the 今日版面 category card with a compact short-news card.
4. Keep article modal click behavior shared for both groups.
5. Build the frontend.
