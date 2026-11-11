export const meta = {
  name: 'plan-crawler-fullcontent-dedup',
  description: 'Plan crawler upgrades: full-content scraping + cross-platform dedup for Portuguese news',
  phases: [
    { title: 'Understand', detail: 'Map current crawler/enrichment/storage/orchestration from real code' },
    { title: 'Research', detail: 'Full-content extraction + cross-platform near-duplicate detection' },
    { title: 'Synthesize', detail: 'Produce a grounded development plan' },
  ],
}

const ROOT = '/Users/yongbinjiang/Documents/Projects/DiaryNews'

const CODE_FINDINGS = {
  type: 'object',
  properties: {
    area: { type: 'string' },
    summary: { type: 'string' },
    keyFiles: {
      type: 'array',
      items: {
        type: 'object',
        properties: { path: { type: 'string' }, role: { type: 'string' } },
        required: ['path', 'role'],
      },
    },
    currentCapabilities: { type: 'array', items: { type: 'string' } },
    gaps: { type: 'array', items: { type: 'string' } },
    relevantToFullContent: { type: 'array', items: { type: 'string' } },
    relevantToDedup: { type: 'array', items: { type: 'string' } },
  },
  required: ['area', 'summary', 'keyFiles', 'currentCapabilities', 'gaps'],
}

const RESEARCH_FINDINGS = {
  type: 'object',
  properties: {
    topic: { type: 'string' },
    approaches: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          howItWorks: { type: 'string' },
          pros: { type: 'array', items: { type: 'string' } },
          cons: { type: 'array', items: { type: 'string' } },
          pythonLib: { type: 'string' },
          fitForProject: { type: 'string' },
        },
        required: ['name', 'howItWorks', 'fitForProject'],
      },
    },
    recommendation: { type: 'string' },
    sources: { type: 'array', items: { type: 'string' } },
  },
  required: ['topic', 'approaches', 'recommendation'],
}

const PLAN = {
  type: 'object',
  properties: {
    overview: { type: 'string' },
    objectives: { type: 'array', items: { type: 'string' } },
    recommendedContentApproach: { type: 'string' },
    recommendedDedupApproach: { type: 'string' },
    workstreams: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          goal: { type: 'string' },
          tasks: { type: 'array', items: { type: 'string' } },
          filesToChange: { type: 'array', items: { type: 'string' } },
          effort: { type: 'string' },
          risks: { type: 'array', items: { type: 'string' } },
        },
        required: ['name', 'goal', 'tasks'],
      },
    },
    sequencing: { type: 'array', items: { type: 'string' } },
    openQuestions: { type: 'array', items: { type: 'string' } },
  },
  required: ['overview', 'objectives', 'workstreams', 'recommendedDedupApproach', 'recommendedContentApproach'],
}

const understandTasks = [
  {
    label: 'crawler-package',
    prompt: `You are mapping the crawler subsystem of a FastAPI Portuguese-news aggregator at ${ROOT}.
Read the \`crawler/\` package thoroughly: top-level modules (the runner, BaseAdapter) and EVERY file under \`crawler/adapters/\`.
Determine precisely:
(1) how CrawlerRunner orchestrates adapters (parallelism, error handling, source_health),
(2) the full list of news sources/adapters and what each fetches,
(3) exactly what fields each RSS adapter captures per article — title, link, summary/description, full body, published date, image, author,
(4) whether ANY adapter already fetches full article content vs only the RSS summary/snippet, and whether any source offers full-text RSS,
(5) the BaseAdapter contract (required methods, returned data shape).
Focus especially on what relates to capturing FULL article BODY content and any existing deduplication. Be concrete with file paths and line references. Return structured findings.`,
  },
  {
    label: 'enrichment-scraping',
    prompt: `Read \`news.py\`, \`prompts.py\`, and \`llm.py\` in ${ROOT}.
Map the enrichment + on-demand scraping pipeline:
(1) how on-demand scraping works — trafilatura usage, exactly which URL is scraped, configuration/options passed, fallback to RSS summary when scraping fails,
(2) how full article body content is extracted and stored, any minimum-length / short-content checks,
(3) the MiniMax LLM enrichment (Chinese title/content/tags translation + Portuguese category classification), and how tags_zh piggybacks on the translation call,
(4) retry/attempt logic, MAX_ENRICHMENT_ATTEMPTS, enrichment_error, the failed state, rate-limiting (3s sleep).
Identify where full-content capture currently succeeds vs fails and the quality gaps. Be concrete with file paths and function names. Return structured findings.`,
  },
  {
    label: 'storage-schema-dedup',
    prompt: `Read the \`storage/\` package (especially \`storage/news.py\`) and locate the SQLite schema/DDL in ${ROOT} (look for CREATE TABLE statements, a schema/migrations module, or schema setup in storage/__init__ or a db module).
Determine precisely:
(1) the articles table schema — ALL columns, including any content/body/summary fields, enrichment_status, hash/dedup keys, source, url, published date,
(2) EXACTLY how deduplication currently works during collection — by URL? by title? by hash? Is it within-source only or cross-source? Show the code,
(3) the age filter logic,
(4) how raw articles are saved as enrichment_status='pending'.
Focus especially on CROSS-PLATFORM duplicate detection: does anything detect the same story republished by different sources? What columns/identifiers exist that could support content-based dedup (e.g. a place to store a content hash, fingerprint, or cluster id)? Be concrete with file paths. Return structured findings.`,
  },
  {
    label: 'services-api-orchestration',
    prompt: `Read \`services.py\` and \`api.py\` in ${ROOT}.
Map the orchestration end to end:
(1) Stage A collect flow (collect_news) and Stage B enrich flow (enrich_pending_news) — what each does step by step,
(2) the endpoints: /api/news/collect, /api/news/fetch (A+B inline), /api/news/enrich — request/response shapes,
(3) the threading.Lock guards and the 409 'Crawler already running' behavior,
(4) where and how dedupe + age filter is applied during collection,
(5) the seam between Stage A and Stage B (how pending rows flow to enrichment).
Identify the exact hook points where (a) improved full-content scraping and (b) a new cross-source dedup step would slot in. Be concrete with file paths and function names. Return structured findings.`,
  },
]

const researchTasks = [
  {
    label: 'research-dedup',
    prompt: `Research robust techniques for detecting near-duplicate / same-story news articles published across DIFFERENT platforms (different RSS sources republishing the same wire story, or independently covering the same event).
Context: a Python + SQLite news aggregator pulling ~9 Portuguese RSS sources. Each article has a title + (often) full body text in Portuguese. Modest volume (tens-to-low-hundreds of new articles per run). It needs to flag/group cross-source duplicates so the UI doesn't show the same story repeatedly.
Compare these approaches and for EACH give howItWorks, pros, cons, the concrete pythonLib (with current package name), and fitForProject:
- exact URL canonicalization + content SHA hash
- title fuzzy matching (RapidFuzz token_set_ratio / Levenshtein)
- SimHash (near-duplicate fingerprint, Hamming distance)
- MinHash + LSH (datasketch)
- TF-IDF cosine similarity (scikit-learn)
- multilingual sentence-embedding similarity (sentence-transformers, e.g. paraphrase-multilingual-MiniLM)
- LLM-based clustering (they already call MiniMax)
Use web search to confirm current best practices and library names/versions as of 2026. Consider that they want something lightweight that runs incrementally in SQLite without a heavy vector DB. Give a concrete, opinionated recommendation (likely a cheap pre-filter + a stronger similarity check). Return structured findings with sources.`,
  },
  {
    label: 'research-fullcontent',
    prompt: `Research best practices for reliably extracting FULL article BODY text from news websites in 2026, with emphasis on Portuguese news sites (e.g. Público, Observador, Diário de Notícias, SAPO, RTP, Expresso).
Context: a Python aggregator currently uses trafilatura to scrape article bodies on demand, with the RSS summary as fallback; some extractions fail or return truncated/short content.
Compare/confirm and for EACH give howItWorks, pros, cons, concrete pythonLib, and fitForProject:
- trafilatura best-practice configuration (favor_recall/precision, include_comments, output options, fetch_url vs bare_extraction, fallback chains)
- newspaper3k / newspaper4k
- readability-lxml
- goose3
- boilerpy3 / jusText
- handling JS-rendered pages (when to escalate to a headless browser / Playwright), cookie/consent walls common on EU sites, and paywalls
- detecting full-text RSS feeds and using RSS content:encoded when available to skip scraping entirely
- techniques to DETECT truncated/short extractions and trigger fallback/escalation
Use web search to confirm current library status (which are maintained in 2026). Give a concrete recommendation for maximizing extraction success rate cheaply (extraction chain + truncation detection + when to escalate). Return structured findings with sources.`,
  },
]

phase('Understand')
log('Mapping current crawler, enrichment, storage, and orchestration from the real code; researching extraction + dedup in parallel')

const allFindings = await parallel([
  ...understandTasks.map(t => () =>
    agent(t.prompt, { label: t.label, phase: 'Understand', schema: CODE_FINDINGS, agentType: 'Explore' })),
  ...researchTasks.map(t => () =>
    agent(t.prompt, { label: t.label, phase: 'Research', schema: RESEARCH_FINDINGS })),
])

const codeFindings = allFindings.slice(0, understandTasks.length).filter(Boolean)
const researchFindings = allFindings.slice(understandTasks.length).filter(Boolean)

phase('Synthesize')
log('Synthesizing findings into a grounded development plan')

const synthPrompt = `You are a senior backend architect. Produce a concrete, grounded DEVELOPMENT PLAN to upgrade the crawler of a FastAPI + SQLite Portuguese-news aggregator at ${ROOT}.

GOALS (from the user, verbatim intent):
1. Crawl Portuguese news.
2. Capture FULL article content (body text), not just titles/summaries, for ALL articles where possible.
3. Add the ability to filter out duplicate content across different platforms (cross-source same-story dedup).

You are given (a) findings from reading the ACTUAL current code, and (b) external best-practice research. Ground every recommendation in the real architecture — reference real files/functions from the code findings. Respect these existing constraints: MiniMax rate limits are tight (sequential enrichment, 3s sleep), data is in SQLite at data/diarynews.db, the pipeline is Stage A collect (pending) -> Stage B enrich (scrape + LLM). Prefer lightweight, incremental solutions that fit SQLite without a heavy vector DB. Do NOT over-engineer.

For dedup, prefer a cheap pre-filter + stronger check design and say exactly where it hooks into the collect/enrich flow and what schema column(s) to add. For full content, propose an extraction chain + truncation detection + when (if ever) to escalate to a headless browser, and whether to exploit full-text RSS (content:encoded) when sources offer it.

Break the work into discrete, sequenceable workstreams with concrete tasks and the real files each touches. Note effort and risks. List open questions the user must decide.

=== CODE FINDINGS (current state) ===
${JSON.stringify(codeFindings, null, 2)}

=== RESEARCH FINDINGS (best practices) ===
${JSON.stringify(researchFindings, null, 2)}

Return the structured plan.`

const plan = await agent(synthPrompt, { label: 'synthesize-plan', phase: 'Synthesize', schema: PLAN })

return { codeFindings, researchFindings, plan }
