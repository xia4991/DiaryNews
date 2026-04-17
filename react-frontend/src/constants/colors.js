/**
 * Single source for semantic accent colors used by badges across the app.
 * Keep values in the Porcelain Blue palette family:
 *   azulejo blue (#2B6CB0) · green (#2E7D5A) · amber (#B8843C)
 *   plum (#8B5A9F) · mid-blue (#3E7CB1) · terracotta (#C25B45)
 *   neutral (#5E6478)
 *
 * Badge consumes these as a single hex; opacity tints are computed in-place.
 */

export const CATEGORY_COLORS = {
  'Política':      '#2B6CB0',
  'Desporto':      '#B8843C',
  'Economia':      '#2E7D5A',
  'Saúde':         '#B04444',
  'Tecnologia':    '#8B5A9F',
  'Internacional': '#3E7CB1',
  'Cultura':       '#8B5A9F',
  'Ambiente':      '#2E7D5A',
  'Crime/Justiça': '#B04444',
  'Sociedade':     '#5E6478',
  'Geral':         '#5E6478',
  default:         '#5E6478',
}

export const categoryColor = (name) => CATEGORY_COLORS[name] || CATEGORY_COLORS.default

// Chinese-interest tags — the one Portuguese-terracotta accent in the palette.
export const TAG_COLOR = '#C25B45'

export const INDUSTRY_COLORS = {
  Restaurant:    '#B8843C',
  ShoppingStore: '#3E7CB1',
  Driving:       '#2E7D5A',
  Other:         '#5E6478',
}
