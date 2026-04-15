import { useState } from 'react'
import ArticleCardFeatured from '../components/news/ArticleCardFeatured'
import ArticleCard from '../components/news/ArticleCard'
import ArticleModal from '../components/news/ArticleModal'

export default function NewsTab({ articles }) {
  const [selected, setSelected] = useState(null)

  if (!articles.length) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <span className="material-symbols-outlined text-4xl text-on-surface-variant">newspaper</span>
        <p className="text-on-surface-variant">暂无新闻。点击 <strong className="text-on-surface">获取葡萄牙新闻</strong> 加载。</p>
      </div>
    )
  }

  const [featured, ...rest] = articles

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold font-headline tracking-tighter mb-1">
          葡萄牙新闻
        </h1>
        <p className="text-on-surface-variant text-sm max-w-xl">
          葡萄牙新闻，AI翻译中文精炼版。
        </p>
      </div>

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
