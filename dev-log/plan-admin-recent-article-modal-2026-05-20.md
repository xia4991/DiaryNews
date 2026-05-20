# Admin Recent Article Modal

## Summary

Allow articles in 管理 → 爬虫 → 最近抓取的文章 to open the same article detail
modal used by the news pages.

## Tasks

1. Extend the admin recent articles payload with summary, scraped content,
   Chinese content, and view count.
2. Reuse `ArticleModal` from the news components inside `CrawlerSection`.
3. Make each recent article row clickable while keeping the original link button.
4. Compile backend and build frontend.
