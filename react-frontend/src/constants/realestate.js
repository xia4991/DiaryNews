export const DEAL_TYPES = ['sale', 'rent']

export const DEAL_TYPE_ZH = {
  sale: '出售',
  rent: '出租',
}

export const DEAL_TYPE_COLORS = {
  sale: '#2B6CB0',
  rent: '#2E7D5A',
}

export const ROOMS_OPTIONS = [1, 2, 3, 4, 5]

export function formatPrice(priceCents, dealType) {
  const euros = (priceCents / 100).toLocaleString('pt-PT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
  return dealType === 'rent' ? `€${euros} / 月` : `€${euros}`
}
