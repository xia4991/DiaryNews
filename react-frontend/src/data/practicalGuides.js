export const GUIDE_TYPE_META = {
  important: { label: '重要信息', color: '#9D3D33', icon: 'priority_high' },
  tutorial: { label: '教程', color: '#2B6CB0', icon: 'school' },
  resource: { label: '实用资料', color: '#2E7D5A', icon: 'inventory_2' },
}

export const PRACTICAL_GUIDES = [
  {
    id: 'aima-first-checklist',
    title: 'AIMA 居留事务办理前检查清单',
    type: 'important',
    category: '居留身份',
    summary: '预约、材料、翻译件和证明文件容易遗漏，出发前先按这份清单核对。',
    date: '2026-05-21',
    importance: 'high',
    tags: ['AIMA', '居留', '材料准备'],
    content: [
      '办理居留相关事务前，先确认预约时间、办理地点、证件有效期和需要携带的原件。不要只带照片或扫描件，很多窗口仍会要求查看原件。',
      '常见材料包括护照、居留卡或预约证明、住址证明、收入或工作证明、保险或社保相关文件。不同情形会有差异，最终以官方通知和预约页面要求为准。',
      '如果文件不是葡语，提前确认是否需要认证翻译。当天临时补材料通常会拖慢进度，也可能需要重新预约。',
    ],
    links: [
      { label: 'AIMA 官方网站', href: 'https://aima.gov.pt' },
      { label: 'ePortugal 公共服务', href: 'https://eportugal.gov.pt' },
    ],
  },
  {
    id: 'sns-health-number',
    title: '葡萄牙 SNS 医疗号码和家庭医生怎么理解',
    type: 'important',
    category: '医疗生活',
    summary: '解释 SNS 用户号、健康中心和家庭医生的关系，适合刚到葡萄牙的人快速建立概念。',
    date: '2026-05-20',
    importance: 'high',
    tags: ['SNS', '医疗', '生活'],
    content: [
      'SNS 是葡萄牙公共医疗系统。拿到 SNS 用户号后，通常可以在健康中心登记，并根据当地资源安排家庭医生。',
      '家庭医生不是急诊入口。紧急情况应该联系急救或前往急诊；普通问诊、长期病、开药和转诊更常通过健康中心处理。',
      '不同城市和健康中心等待情况不同。建议保留住址证明、身份证明和联系方式，登记后定期确认资料是否更新。',
    ],
    links: [
      { label: 'SNS 24', href: 'https://www.sns24.gov.pt' },
    ],
  },
  {
    id: 'nif-bank-account-basics',
    title: 'NIF、银行账户和租房前后的顺序',
    type: 'tutorial',
    category: '新手入门',
    summary: '刚来葡萄牙时，NIF、银行账户、住址证明经常互相卡住，这里给一个实用顺序。',
    date: '2026-05-18',
    importance: 'medium',
    tags: ['NIF', '银行', '租房'],
    content: [
      '多数长期生活事项都会用到 NIF，包括租房、签约、开户、购买服务和报税相关流程。先确认自己是否已经有可正常使用的 NIF。',
      '银行开户通常需要身份证明、NIF、住址和收入或工作相关资料。不同银行要求不同，提前预约和准备英文/葡语材料会更顺。',
      '租房前要确认合同、押金、付款方式和房东身份。不要只凭聊天记录转大额押金，尽量保留书面凭证。',
    ],
    links: [
      { label: 'Portal das Finanças', href: 'https://www.portaldasfinancas.gov.pt' },
    ],
  },
  {
    id: 'job-post-safety',
    title: '看招聘信息时先检查这几件事',
    type: 'tutorial',
    category: '工作求职',
    summary: '快速判断招聘信息是否清楚：岗位、薪资、合同、地点、联系方式和试工安排。',
    date: '2026-05-16',
    importance: 'medium',
    tags: ['招聘', '合同', '求职'],
    content: [
      '一条清楚的招聘信息应该说明岗位职责、工作地点、薪资范围、排班方式、合同类型和联系方式。如果核心信息长期模糊，需要谨慎沟通。',
      '试工前建议确认是否付费、时长多久、谁负责安排以及是否涉及现金押金。正规岗位通常不需要求职者先支付费用。',
      '如果你在平台发布招聘，尽量写清行业、地点、薪资、联系方式和是否需要葡语。信息越具体，收到的咨询越有效。',
    ],
    links: [],
  },
  {
    id: 'useful-official-links',
    title: '常用官方入口速查',
    type: 'resource',
    category: '常用链接',
    summary: '把常见公共服务入口放在一起，方便之后继续补充成完整导航。',
    date: '2026-05-14',
    importance: 'medium',
    tags: ['官方入口', '公共服务'],
    content: [
      '这一页先收集常见公共服务入口，适合作为办事前的起点。具体材料、费用和预约要求仍要以官方页面最新说明为准。',
      '如果你不确定某个页面是否真实，优先从官方主站进入，不要通过陌生短信或聊天链接提交个人资料。',
    ],
    links: [
      { label: 'ePortugal', href: 'https://eportugal.gov.pt' },
      { label: 'Finanças', href: 'https://www.portaldasfinancas.gov.pt' },
      { label: 'Segurança Social', href: 'https://www.seg-social.pt' },
      { label: 'SNS 24', href: 'https://www.sns24.gov.pt' },
    ],
  },
  {
    id: 'daily-life-documents',
    title: '日常文件保存建议',
    type: 'resource',
    category: '生活资料',
    summary: '哪些文件最好长期保存电子版和纸质版，遇到办事或租房时能少慌一点。',
    date: '2026-05-12',
    importance: 'low',
    tags: ['文件', '生活', '备份'],
    content: [
      '建议长期保存护照、居留卡、NIF、NISS、SNS、租房合同、工资单、银行证明、保险文件和学校/工作证明的电子版。',
      '电子版可以按年份和主题命名，例如 residence-2026、rent-contract、payslips。需要现场办理时，再准备纸质复印件。',
      '涉及个人身份、银行和税务的文件不要随便发给陌生人。必须发送时，确认对方身份和用途。',
    ],
    links: [],
  },
]

export const GUIDE_CATEGORIES = ['全部', ...Array.from(new Set(PRACTICAL_GUIDES.map((item) => item.category)))]
