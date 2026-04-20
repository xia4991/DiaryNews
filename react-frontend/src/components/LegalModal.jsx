import Modal from './ui/Modal'

const PRIVACY_CONTENT = `
## 隐私政策

**最后更新：2026年4月20日**

葡萄牙华人信息中心（"HuarenPT"，网址 app.huarenpt.com）致力于保护你的个人数据。本政策适用于欧盟《通用数据保护条例》(GDPR)。

### 我们收集的数据

- **账户信息**：通过 Google OAuth 登录时，我们获取你的 Google 姓名、邮箱地址和头像 URL。
- **用户内容**：你在平台上发布的招聘、房产、二手信息、社区帖子和回复。
- **使用数据**：新闻浏览记录（文章点击计数），用于改善内容推荐。

### 数据用途

- 维持你的登录状态和平台身份
- 显示你发布的内容
- 改善平台服务和内容推荐

### 数据存储

- 数据存储在位于欧盟的服务器上
- 我们不会将你的个人数据出售给第三方
- 我们使用 Cloudflare 提供安全防护和 CDN 服务

### Cookie 和本地存储

- **JWT 令牌**：用于维持登录状态，存储在浏览器 localStorage 中
- **Cookie 同意**：记录你是否已确认 Cookie 通知
- 我们不使用第三方追踪 Cookie 或广告追踪器

### 你的权利（GDPR）

根据 GDPR，你拥有以下权利：

- **访问权**：查看你的个人数据
- **可携带权**：导出你的所有数据（个人资料 → 导出我的数据）
- **删除权**：永久注销账号及删除所有关联数据（个人资料 → 注销账号）
- **更正权**：修改你的公开昵称和联系信息

### 联系我们

如有隐私相关问题，请联系：privacy@huarenpt.com
`.trim()

const TERMS_CONTENT = `
## 使用条款

**最后更新：2026年4月20日**

欢迎使用葡萄牙华人信息中心（"HuarenPT"）。使用本平台即表示你同意以下条款。

### 平台服务

HuarenPT 是一个信息聚合平台，提供：
- 葡萄牙新闻的中文翻译和筛选
- 招聘、房产、二手物品发布
- 社区讨论
- AI 智能助手

### 用户内容

- 你对自己发布的内容负全部责任
- 禁止发布违法、欺诈、歧视性或侵权内容
- 我们保留删除或隐藏违规内容的权利
- 你的内容可被其他用户举报

### 新闻内容

- 新闻来源于公开 RSS 源，版权归原媒体所有
- 中文翻译由 AI 自动生成，可能存在误差
- 我们提供原文链接，建议以原文为准

### 免责声明

- 平台内容仅供参考，不构成法律、财务或其他专业建议
- 对于用户间的交易和联系，平台不承担中介责任
- AI 生成的翻译和摘要可能不完全准确

### 账户

- 使用 Google 账号登录
- 你可以随时导出数据或注销账号
- 我们保留在违规情况下限制或删除账号的权利

### 适用法律

本条款适用葡萄牙法律及欧盟相关法规。

### 联系我们

如有问题，请联系：contact@huarenpt.com
`.trim()

const PAGES = {
  privacy: { title: '隐私政策', content: PRIVACY_CONTENT },
  terms: { title: '使用条款', content: TERMS_CONTENT },
}

export default function LegalModal({ page, onClose }) {
  const { title, content } = PAGES[page] || PAGES.privacy

  return (
    <Modal onClose={onClose} title={title} size="lg">
      <div
        className="prose prose-sm max-w-none text-text
          [&_h2]:text-lg [&_h2]:font-black [&_h2]:text-text [&_h2]:mt-0 [&_h2]:mb-4
          [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-text [&_h3]:mt-5 [&_h3]:mb-2
          [&_p]:text-sm [&_p]:leading-7 [&_p]:text-text-muted [&_p]:mb-2
          [&_ul]:text-sm [&_ul]:leading-7 [&_ul]:text-text-muted [&_ul]:mb-2 [&_ul]:pl-5 [&_ul]:list-disc
          [&_li]:mb-1
          [&_strong]:text-text [&_strong]:font-semibold"
      >
        {content.split('\n').map((line, i) => {
          if (line.startsWith('## ')) return <h2 key={i}>{line.slice(3)}</h2>
          if (line.startsWith('### ')) return <h3 key={i}>{line.slice(4)}</h3>
          if (line.startsWith('- **')) {
            const match = line.match(/^- \*\*(.+?)\*\*[：:](.+)$/)
            if (match) return <li key={i}><strong>{match[1]}</strong>：{match[2]}</li>
            return <li key={i}>{line.slice(2)}</li>
          }
          if (line.startsWith('- ')) return <li key={i}>{line.slice(2)}</li>
          if (line.trim() === '') return null
          return <p key={i}>{line}</p>
        })}
      </div>
    </Modal>
  )
}
