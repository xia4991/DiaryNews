const CHANNELS = ['首页', '华人关注', '葡萄牙新闻', '招聘', '房产', '二手', '社区', 'AI 助手']

const SUPPORT_ITEMS = [
  '联系与反馈',
  '帮助与说明',
]

const LEGAL_ITEMS = [
  '隐私说明',
  '使用说明',
  '免责声明',
]

export default function Footer({ onTabChange }) {
  return (
    <footer className="relative overflow-hidden border-t border-[#E1D9CD] bg-[linear-gradient(180deg,#f8f4ec_0%,#f2eae0_100%)] text-text">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-[linear-gradient(180deg,rgba(255,255,255,0.55)_0%,rgba(255,255,255,0)_100%)]"
      />

      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-8 px-5 py-10 sm:px-8 sm:py-14 lg:grid-cols-[1.45fr_0.95fr_0.85fr_0.85fr] lg:px-10">
        <div className="col-span-2 max-w-md lg:col-span-1">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#D57B4E] text-white shadow-[0_10px_24px_rgba(213,123,78,0.16)]">
              <span className="material-symbols-outlined" style={{ fontSize: 24 }}>public</span>
            </span>
            <div>
              <p
                className="text-xl font-black tracking-tight text-[#2E2721]"
                style={{ fontFamily: 'var(--font-headline)' }}
              >
                葡萄牙华人信息中心
              </p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9D8A76]">
                Portugal Chinese Hub
              </p>
            </div>
          </div>

          <p className="mt-5 max-w-sm text-sm leading-7 text-[#6E6255]">
            为在葡华人提供新闻、招聘、房产、二手、社区与 AI 助手的信息平台。
          </p>

          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#E3D8C9] bg-white/55 px-3 py-2 text-xs text-[#7E6F61]">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>info</span>
            平台内容持续更新中
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8D7B69]">主要频道</p>
          <div className="mt-4 grid gap-2.5 sm:mt-5 sm:gap-3">
            {CHANNELS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => onTabChange(tab)}
                className="group flex items-center gap-2 text-left text-[13px] text-[#6E6255] transition-colors hover:text-[#2E2721] sm:text-sm"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#D4C2AE] transition-colors group-hover:bg-[#D57B4E]" />
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8D7B69]">服务</p>
          <div className="mt-4 grid gap-2.5 sm:mt-5 sm:gap-3">
            {SUPPORT_ITEMS.map((item) => (
              <p key={item} className="text-[13px] text-[#6E6255] sm:text-sm">
                {item}
              </p>
            ))}
          </div>
          <p className="mt-4 text-[11px] leading-6 text-[#8A7B6C] sm:mt-5 sm:text-xs">
            如果你对频道内容或平台使用有建议，可以后续从这里继续接入正式入口。
          </p>
        </div>

        <div className="col-span-2 sm:col-span-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8D7B69]">法律</p>
          <div className="mt-4 grid gap-2.5 sm:mt-5 sm:gap-3">
            {LEGAL_ITEMS.map((item) => (
              <p key={item} className="text-[13px] text-[#6E6255] sm:text-sm">
                {item}
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-2 border-t border-[#E1D9CD] px-5 py-4 pb-24 text-center sm:px-8 sm:text-left md:flex-row md:items-center md:justify-between md:pb-4 lg:px-10">
        <p className="text-xs text-[#8A7B6C]">
          © 2026 葡萄牙华人信息中心 版权所有
        </p>
        <p className="text-xs text-[#A08F7E]">
          Portugal Chinese Hub
        </p>
      </div>
    </footer>
  )
}
