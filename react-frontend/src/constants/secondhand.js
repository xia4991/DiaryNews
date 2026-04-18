export const SH_CATEGORIES = [
  'Electronics', 'Furniture', 'Clothing', 'Vehicle', 'Baby', 'Sports', 'Books', 'Other',
]

export const CATEGORY_ZH = {
  Electronics: '电子产品',
  Furniture: '家具家居',
  Clothing: '服饰鞋包',
  Vehicle: '车辆出行',
  Baby: '母婴用品',
  Sports: '运动户外',
  Books: '图书文具',
  Other: '其他',
}

export const CATEGORY_ICONS = {
  Electronics: 'devices',
  Furniture: 'chair',
  Clothing: 'checkroom',
  Vehicle: 'directions_car',
  Baby: 'child_care',
  Sports: 'fitness_center',
  Books: 'menu_book',
  Other: 'category',
}

export const CATEGORY_COLORS = {
  Electronics: '#3B82F6',
  Furniture: '#8B5CF6',
  Clothing: '#EC4899',
  Vehicle: '#EF4444',
  Baby: '#F59E0B',
  Sports: '#10B981',
  Books: '#6366F1',
  Other: '#6B7280',
}

export const SH_CONDITIONS = ['new', 'like_new', 'good', 'fair']

export const CONDITION_ZH = {
  new: '全新',
  like_new: '几乎全新',
  good: '良好',
  fair: '一般',
}

export const CONDITION_COLORS = {
  new: '#10B981',
  like_new: '#3B82F6',
  good: '#F59E0B',
  fair: '#EF4444',
}

export function formatPrice(priceCents) {
  if (!priceCents && priceCents !== 0) return '价格面议'
  return `€${(priceCents / 100).toLocaleString('pt-PT', { minimumFractionDigits: 0 })}`
}
