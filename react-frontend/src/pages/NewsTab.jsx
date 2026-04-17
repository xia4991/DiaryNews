import { useState } from 'react'
import ArticleCardFeatured from '../components/news/ArticleCardFeatured'
import ArticleCard from '../components/news/ArticleCard'
import ArticleModal from '../components/news/ArticleModal'
import SectionHeader from '../components/ui/SectionHeader'

export default function NewsTab({
  articles,
  tabTitle = '葡萄牙新闻',
  tabSubtitle = '葡萄牙新闻，AI翻译中文精炼版。',
  emptyHint = '获取葡萄牙新闻',
}) {
  const [selected, setSelected] = useState(null)

  if (!articles.length) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <span className="material-symbols-outlined text-4xl text-text-subtle">newspaper</span>
        <p className="text-sm text-text-muted">
          暂无新闻。点击 <strong className="text-text">{emptyHint}</strong> 加载。
        </p>
      </div>
    )
  }

  const [featured, ...rest] = articles

  return (
    <>
      <SectionHeader title={tabTitle} subtitle={tabSubtitle} />

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ArticleCardFeatured article={featured} onClick={setSelected} />
        {rest.map(article => (
          <ArticleCard key={article.link} article={article} onClick={setSelected} />
        ))}
      </section>

      {selected && <ArticleModal article={selected} onClose={() => setSelected(null)} />}
    </>
  )
}
