import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

const QUICK_ACTIONS = [
  { tab: '华人关注', label: '华人关注', icon: 'diversity_3', tone: '#9D3D33' },
  { tab: '葡萄牙新闻', label: '葡萄牙新闻', icon: 'newspaper', tone: '#2B6CB0' },
  { tab: '招聘', label: '招聘信息', icon: 'work', tone: '#2E7D5A' },
  { tab: 'YouTube', label: '视频摘要', icon: 'play_circle', tone: '#B04444' },
]

function formatDate(value) {
  if (!value) return '暂无更新'
  return value.slice(0, 16).replace('T', ' ')
}

function StatCard({ label, value, hint }) {
  return (
    <Card className="rounded-[24px] border-white/70 bg-white/90 shadow-[0_18px_50px_rgba(58,44,31,0.08)] backdrop-blur">
      <p className="text-[11px] uppercase tracking-[0.18em] text-text-subtle">{label}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-text" style={{ fontFamily: 'var(--font-headline)' }}>
        {value}
      </p>
      <p className="mt-2 text-sm text-text-muted">{hint}</p>
    </Card>
  )
}

function PreviewList({ items, empty, renderItem }) {
  if (!items.length) {
    return (
      <Card className="rounded-[24px] border-dashed border-border-strong bg-surface-muted text-text-muted">
        <p className="text-sm">{empty}</p>
      </Card>
    )
  }
  return (
    <div className="grid gap-3">
      {items.map(renderItem)}
    </div>
  )
}

export default function HomePage({
  user,
  articles,
  cnArticles,
  videos,
  jobs,
  ideas,
  newsLastUpdated,
  ytLastUpdated,
  onTabChange,
  onLoginClick,
}) {
  const featuredCn = cnArticles.slice(0, 3)
  const latestNews = articles.slice(0, 4)
  const latestVideos = videos.slice(0, 2)
  const latestJobs = jobs.slice(0, 3)
  const leadArticle = featuredCn[0] || latestNews[0] || null
  const signalArticles = (featuredCn.slice(1, 3).length ? featuredCn.slice(1, 3) : latestNews.slice(1, 3))
  const topTags = Object.entries(
    cnArticles.reduce((acc, article) => {
      for (const tag of (article.tags_zh || '').split(',').map((item) => item.trim()).filter(Boolean)) {
        acc[tag] = (acc[tag] || 0) + 1
      }
      return acc
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-[420px] rounded-[40px]"
        style={{
          background:
            'radial-gradient(circle at top left, rgba(157,61,51,0.18), transparent 40%), radial-gradient(circle at top right, rgba(43,108,176,0.18), transparent 36%), linear-gradient(180deg, rgba(253,249,242,0.98), rgba(245,243,238,0.88))',
        }}
      />

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_360px] lg:items-start">
        <div className="grid gap-6 pt-4 sm:pt-8">
          <div>
            <Badge color="#9D3D33">Portugal Chinese Hub</Badge>
            <div className="mt-4 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-4xl">
                <h1
                  className="text-4xl font-black tracking-[-0.04em] text-text sm:text-5xl lg:text-6xl"
                  style={{ fontFamily: 'var(--font-headline)' }}
                >
                  葡萄牙华人信息中心
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-8 text-text-muted sm:text-lg">
                  一个为在葡华人整理新闻、招聘、视频与灵感的日常信息中心。先看重点，再进入你今天最需要的页面。
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:max-w-[420px]">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.tab}
                    onClick={() => onTabChange(action.tab)}
                    className="group inline-flex items-center gap-3 rounded-2xl border border-white/70 bg-white/92 px-4 py-3 text-left text-sm font-semibold text-text shadow-[0_12px_34px_rgba(58,44,31,0.08)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(58,44,31,0.12)]"
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                      style={{ background: `${action.tone}14`, color: action.tone }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                        {action.icon}
                      </span>
                    </span>
                    <span>{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
            <Card className="relative overflow-hidden rounded-[32px] border-[#E2D2BF] bg-[linear-gradient(135deg,#fffaf2_0%,#f4e7d6_100%)] p-0 shadow-[0_26px_56px_rgba(86,60,33,0.16)]">
              <div
                aria-hidden
                className="absolute right-0 top-0 h-40 w-40 rounded-full blur-3xl"
                style={{ background: 'rgba(157,61,51,0.16)' }}
              />
              <div className="relative px-6 py-6 sm:px-7 sm:py-7">
                <div className="flex items-center justify-between gap-4">
                  <Badge color="#9D3D33">今日焦点</Badge>
                  <button
                    onClick={() => onTabChange('华人关注')}
                    className="text-sm font-semibold text-accent transition-colors hover:text-accent-hover"
                  >
                    查看更多
                  </button>
                </div>

                <h2
                  className="mt-5 max-w-2xl text-2xl font-black leading-tight tracking-tight text-text sm:text-[2rem]"
                  style={{ fontFamily: 'var(--font-headline)' }}
                >
                  {leadArticle?.title_zh || leadArticle?.title || '今天的重点内容会出现在这里'}
                </h2>

                <p className="mt-4 max-w-2xl text-sm leading-8 text-text-muted sm:text-[15px]">
                  {leadArticle?.content_zh || leadArticle?.ai_summary || leadArticle?.summary || '获取新闻后，首页会自动把最相关的华人内容放到这里，方便你不用先点进栏目也能看到重点。'}
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-2">
                  {topTags.length > 0 ? topTags.map(([tag, count]) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/75 px-3 py-1.5 text-xs font-semibold text-text"
                    >
                      <span className="material-symbols-outlined text-[#9D3D33]" style={{ fontSize: 14 }}>sell</span>
                      {tag}
                      <span className="text-text-subtle">{count}</span>
                    </span>
                  )) : (
                    <span className="inline-flex items-center rounded-full border border-white/80 bg-white/75 px-3 py-1.5 text-xs font-semibold text-text-muted">
                      等待华人标签数据
                    </span>
                  )}
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/75 bg-white/70 px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-text-subtle">最新更新</p>
                    <p className="mt-2 text-sm font-semibold text-text">{formatDate(newsLastUpdated)}</p>
                    <p className="mt-2 text-xs leading-6 text-text-muted">新闻流已经整理完成后，这里会优先显示与你更相关的内容。</p>
                  </div>
                  <div className="rounded-2xl border border-white/75 bg-white/70 px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-text-subtle">今天建议</p>
                    <p className="mt-2 text-sm font-semibold text-text">先看华人关注，再切到招聘或视频</p>
                    <p className="mt-2 text-xs leading-6 text-text-muted">适合快速了解生活、政策、社区和工作机会的新变化。</p>
                  </div>
                </div>
              </div>
            </Card>

            <div className="grid gap-5">
              <Card className="rounded-[28px] border-white/80 bg-white/92 shadow-[0_20px_50px_rgba(58,44,31,0.08)]">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <Badge color="#2B6CB0">快读</Badge>
                    <h2 className="mt-3 text-xl font-black tracking-tight text-text" style={{ fontFamily: 'var(--font-headline)' }}>
                      今日简报
                    </h2>
                  </div>
                  <button onClick={() => onTabChange('葡萄牙新闻')} className="text-sm font-semibold text-accent hover:text-accent-hover">
                    全部新闻
                  </button>
                </div>

                <div className="mt-5 grid gap-4">
                  {signalArticles.length > 0 ? signalArticles.map((article, index) => (
                    <div key={article.link} className="flex gap-3 border-b border-border pb-4 last:border-b-0 last:pb-0">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-sm font-black text-accent">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-[0.14em] text-text-subtle">{article.source || 'Portugal'}</p>
                        <h3 className="mt-1 text-sm font-bold leading-6 text-text">{article.title_zh || article.title}</h3>
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-text-muted">当前还没有简报内容。</p>
                  )}
                </div>
              </Card>

              <Card className="rounded-[28px] border-white/80 bg-white/92 shadow-[0_20px_50px_rgba(58,44,31,0.08)]">
                <Badge color="#2E7D5A">入口</Badge>
                <h2 className="mt-3 text-xl font-black tracking-tight text-text" style={{ fontFamily: 'var(--font-headline)' }}>
                  现在可以做什么
                </h2>
                <div className="mt-5 grid gap-3">
                  {[
                    ['看在葡华人最关心的信息', '华人关注'],
                    ['快速浏览公开招聘机会', '招聘'],
                    [user ? '打开视频摘要继续看频道' : '登录后查看视频摘要', user ? 'YouTube' : '首页'],
                  ].map(([text, tab]) => (
                    <button
                      key={`${tab}-${text}`}
                      onClick={() => (tab === '首页' ? onLoginClick() : onTabChange(tab))}
                      className="flex items-center justify-between rounded-2xl border border-border bg-surface-muted px-4 py-3 text-left transition-colors hover:bg-white"
                    >
                      <span className="text-sm font-semibold text-text">{text}</span>
                      <span className="material-symbols-outlined text-accent" style={{ fontSize: 18 }}>
                        arrow_outward
                      </span>
                    </button>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>

        <Card
          className="relative overflow-hidden rounded-[30px] border-[#E6DCCB] bg-[linear-gradient(160deg,#fffdf7_0%,#f7efe4_100%)] p-0 shadow-[0_24px_60px_rgba(86,60,33,0.14)]"
        >
          <div className="border-b border-[#E6DCCB] px-6 py-5">
            <Badge color="#2E7D5A">今日概览</Badge>
            <p className="mt-4 text-2xl font-black tracking-tight text-text" style={{ fontFamily: 'var(--font-headline)' }}>
              {user ? `欢迎回来，${user.name || '朋友'}` : '从这里开始今天的信息浏览'}
            </p>
            <p className="mt-2 text-sm leading-7 text-text-muted">
              新闻更新时间 {formatDate(newsLastUpdated)}，视频更新时间 {formatDate(ytLastUpdated)}。
            </p>
          </div>

          <div className="grid gap-4 px-6 py-5">
            <div className="flex items-center justify-between rounded-2xl bg-white/85 px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-text-subtle">华人精选</p>
                <p className="mt-1 text-base font-bold text-text">{featuredCn[0]?.title_zh || featuredCn[0]?.title || '等待最新内容'}</p>
              </div>
              <button
                onClick={() => onTabChange('华人关注')}
                className="text-sm font-semibold text-accent transition-colors hover:text-accent-hover"
              >
                查看
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <StatCard label="华人相关" value={cnArticles.length} hint="已筛出与在葡华人更相关的新闻条目" />
              <StatCard label="招聘发布" value={jobs.length} hint="公开可见的工作机会，适合快速浏览" />
              <StatCard label="视频摘要" value={videos.length} hint={user ? '已加载的频道视频摘要与字幕' : '登录后可查看视频频道与摘要'} />
              <StatCard label="灵感记录" value={user ? ideas.length : '...'} hint={user ? '你的 Ideas 会在这里继续积累' : '登录后管理私人灵感与草稿'} />
            </div>

            {!user && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#1f2f4c] px-4 py-4 text-white">
                <div>
                  <p className="text-sm font-semibold">登录后解锁 YouTube 与 Ideas</p>
                  <p className="mt-1 text-xs text-white/72">继续保存灵感、管理频道、查看摘要缓存。</p>
                </div>
                <Button variant="primary" size="sm" icon="login" onClick={onLoginClick} className="shrink-0 bg-white text-[#1f2f4c] hover:bg-[#f4ecdf]">
                  登录
                </Button>
              </div>
            )}
          </div>
        </Card>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="全部新闻" value={articles.length} hint="汇总葡萄牙重点媒体与分类内容" />
        <StatCard label="葡语来源" value={new Set(articles.map((article) => article.source)).size} hint="持续抓取的媒体来源数量" />
        <StatCard label="最新职位" value={jobs.filter((job) => job.status === 'active').length} hint="仍在开放中的招聘信息" />
        <StatCard label="频道数量" value={user ? new Set(videos.map((video) => video.channel_id)).size : '--'} hint={user ? '已接入并生成摘要的频道范围' : '登录后查看频道内容'} />
      </section>

      <section className="mt-10 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <Card className="rounded-[30px] border-white/80 bg-white/92 shadow-[0_20px_50px_rgba(58,44,31,0.08)]">
          <div className="flex items-end justify-between gap-4">
            <div>
              <Badge color="#9D3D33">精选</Badge>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-text" style={{ fontFamily: 'var(--font-headline)' }}>
                华人关注
              </h2>
              <p className="mt-1 text-sm text-text-muted">最值得优先查看的在葡华人相关内容。</p>
            </div>
            <button onClick={() => onTabChange('华人关注')} className="text-sm font-semibold text-accent hover:text-accent-hover">
              进入页面
            </button>
          </div>

          <PreviewList
            items={featuredCn}
            empty="暂时还没有华人精选内容，获取新闻后会出现在这里。"
            renderItem={(article) => (
              <div key={article.link} className="mt-4 rounded-2xl border border-border bg-surface-muted px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <Badge color="#9D3D33">{article.tags_zh?.split(',')[0]?.trim() || '精选新闻'}</Badge>
                  <span className="text-xs text-text-subtle">{article.published?.slice(0, 10)}</span>
                </div>
                <h3 className="mt-3 text-lg font-bold leading-7 text-text">
                  {article.title_zh || article.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-text-muted line-clamp-3">
                  {article.content_zh || article.ai_summary || article.summary}
                </p>
              </div>
            )}
          />
        </Card>

        <div className="grid gap-6">
          <Card className="rounded-[30px] border-white/80 bg-white/92 shadow-[0_20px_50px_rgba(58,44,31,0.08)]">
            <div className="flex items-end justify-between gap-4">
              <div>
                <Badge color="#2B6CB0">新闻</Badge>
                <h2 className="mt-3 text-xl font-black tracking-tight text-text" style={{ fontFamily: 'var(--font-headline)' }}>
                  葡萄牙新闻速览
                </h2>
              </div>
              <button onClick={() => onTabChange('葡萄牙新闻')} className="text-sm font-semibold text-accent hover:text-accent-hover">
                全部新闻
              </button>
            </div>

            <PreviewList
              items={latestNews}
              empty="还没有新闻内容。"
              renderItem={(article) => (
                <div key={article.link} className="mt-4 border-b border-border pb-4 last:border-b-0 last:pb-0">
                  <p className="text-xs uppercase tracking-[0.14em] text-text-subtle">{article.source}</p>
                  <h3 className="mt-2 text-base font-bold leading-7 text-text">{article.title_zh || article.title}</h3>
                </div>
              )}
            />
          </Card>

          <Card className="rounded-[30px] border-white/80 bg-white/92 shadow-[0_20px_50px_rgba(58,44,31,0.08)]">
            <div className="flex items-end justify-between gap-4">
              <div>
                <Badge color="#2E7D5A">社区</Badge>
                <h2 className="mt-3 text-xl font-black tracking-tight text-text" style={{ fontFamily: 'var(--font-headline)' }}>
                  招聘与机会
                </h2>
              </div>
              <button onClick={() => onTabChange('招聘')} className="text-sm font-semibold text-accent hover:text-accent-hover">
                查看招聘
              </button>
            </div>

            <PreviewList
              items={latestJobs}
              empty="还没有招聘信息，第一条发布后会显示在这里。"
              renderItem={(job) => (
                <div key={job.id} className="mt-4 rounded-2xl border border-border bg-surface-muted px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <Badge color="#2E7D5A">{job.industry}</Badge>
                    <span className="text-xs text-text-subtle">{job.created_at?.slice(0, 10)}</span>
                  </div>
                  <h3 className="mt-3 text-base font-bold text-text">{job.title}</h3>
                  <p className="mt-2 text-sm text-text-muted">
                    {job.location || '地点待补充'}{job.salary_range ? ` · ${job.salary_range}` : ''}
                  </p>
                </div>
              )}
            />
          </Card>
        </div>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Card className="rounded-[30px] border-white/80 bg-white/92 shadow-[0_20px_50px_rgba(58,44,31,0.08)]">
          <div className="flex items-end justify-between gap-4">
            <div>
              <Badge color="#B04444">视频</Badge>
              <h2 className="mt-3 text-xl font-black tracking-tight text-text" style={{ fontFamily: 'var(--font-headline)' }}>
                YouTube 动态
              </h2>
              <p className="mt-1 text-sm text-text-muted">
                {user ? '已接入频道的最新视频与摘要预览。' : '登录后查看频道、字幕与 AI 摘要。'}
              </p>
            </div>
            {user && (
              <button onClick={() => onTabChange('YouTube')} className="text-sm font-semibold text-accent hover:text-accent-hover">
                进入 YouTube
              </button>
            )}
          </div>

          <PreviewList
            items={latestVideos}
            empty={user ? '还没有视频内容，先去获取 YouTube 数据。' : '登录后这里会展示视频摘要与频道更新。'}
            renderItem={(video) => (
              <div key={video.video_id} className="mt-4 flex gap-4 rounded-2xl border border-border bg-surface-muted p-3">
                <img src={video.thumbnail} alt="" className="h-20 w-32 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs uppercase tracking-[0.14em] text-text-subtle">{video.channel_name}</p>
                  <h3 className="mt-2 line-clamp-2 text-sm font-bold leading-6 text-text">{video.title}</h3>
                  <p className="mt-2 line-clamp-2 text-xs text-text-muted">
                    {video.caption?.summary || '摘要将在打开视频后按需生成或读取缓存。'}
                  </p>
                </div>
              </div>
            )}
          />
        </Card>

        <Card className="rounded-[30px] border-[#E4D5BF] bg-[linear-gradient(180deg,#fffaf0_0%,#f6efe2_100%)] shadow-[0_22px_54px_rgba(86,60,33,0.12)]">
          <Badge color="#B8843C">导航</Badge>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-text" style={{ fontFamily: 'var(--font-headline)' }}>
            按任务进入页面
          </h2>
          <p className="mt-2 text-sm leading-7 text-text-muted">
            如果你每天只看几件事，可以直接从这里进入最适合的页面，不必先在各个标签之间切换。
          </p>

          <div className="mt-6 grid gap-3">
            {[
              ['先看与华人相关的重要信息', '华人关注', 'arrow_outward'],
              ['浏览更完整的葡语新闻与分类', '葡萄牙新闻', 'newsstand'],
              ['查看或发布招聘机会', '招聘', 'work_history'],
              [user ? '继续管理频道与视频摘要' : '登录后管理视频频道与摘要', user ? 'YouTube' : '首页', 'play_circle'],
              [user ? '打开个人灵感与想法记录' : '登录后使用私人 Ideas', user ? 'Ideas' : '首页', 'lightbulb'],
            ].map(([copy, tab, icon]) => (
              <button
                key={`${tab}-${copy}`}
                onClick={() => (tab === '首页' ? onLoginClick() : onTabChange(tab))}
                className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/92 px-4 py-4 text-left transition-colors hover:bg-white"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text">{tab}</p>
                  <p className="mt-1 text-xs text-text-muted">{copy}</p>
                </div>
                <span className="material-symbols-outlined text-accent" style={{ fontSize: 20 }}>
                  {icon}
                </span>
              </button>
            ))}
          </div>
        </Card>
      </section>
    </div>
  )
}
