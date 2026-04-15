const CATEGORY_ZH = {
  'Política': '政治', 'Desporto': '体育', 'Economia': '经济', 'Saúde': '健康',
  'Tecnologia': '科技', 'Internacional': '国际', 'Cultura': '文化', 'Ambiente': '环境',
  'Crime/Justiça': '法治', 'Sociedade': '社会', 'Geral': '综合',
}

export default function ArticleCardFeatured({ article, onClick }) {
  if (!article) return null
  const pub = article.published?.slice(0, 10)

  return (
    <article onClick={() => onClick(article)}
      className="md:col-span-2 relative group overflow-hidden rounded-xl h-56 cursor-pointer"
      style={{ background: '#222a3d' }}>

      <div className="absolute inset-0 bg-gradient-to-br from-primary-container/25 via-transparent to-secondary/10" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      <div className="absolute top-6 right-6 w-32 h-32 rounded-full blur-3xl opacity-15"
        style={{ background: 'linear-gradient(135deg, #c2c1ff, #5e5ce6)' }} />

      <div className="absolute bottom-0 p-5 w-full">
        <div className="flex gap-2 mb-2">
          <span className="text-xs font-bold tracking-widest px-2 py-0.5 rounded-full uppercase"
            style={{ background: 'rgba(68,226,205,0.15)', color: '#44e2cd', border: '1px solid rgba(68,226,205,0.3)' }}>
            {CATEGORY_ZH[article.category] || article.category}
          </span>
          <span className="text-xs text-on-surface-variant flex items-center gap-1">
            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>schedule</span>
            {pub}
          </span>
        </div>
        <h2 className="text-xl font-bold font-headline mb-1.5 leading-tight group-hover:text-primary transition-colors line-clamp-2">
          {article.title_zh || article.title}
        </h2>
        <p className="text-on-surface-variant text-xs line-clamp-1 max-w-xl">{article.content_zh || article.ai_summary || article.summary}</p>
        <div className="mt-3 flex items-center gap-2">
          <div className="h-5 w-5 rounded flex items-center justify-center text-xs font-bold"
            style={{ background: 'rgba(255,255,255,0.1)' }}>
            {article.source?.[0]}
          </div>
          <span className="text-xs font-semibold text-on-surface">{article.source}</span>
        </div>
      </div>
    </article>
  )
}
