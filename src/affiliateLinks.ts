export interface AffiliateLink {
  label: string
  merchant: string
  url: string
}

const AMAZON_TRACKING_ID = 'lowenb-20'

const amazonSearchUrl = (query: string) =>
  `https://www.amazon.com/s?k=${encodeURIComponent(query)}&tag=${AMAZON_TRACKING_ID}`

export const AFFILIATE_LINKS_BY_TEMPLATE: Record<string, AffiliateLink[]> = {
  'avery-8126': [
    {
      label: 'Avery 8126 half-sheet shipping labels',
      merchant: 'Amazon',
      url: amazonSearchUrl('Avery 8126 shipping labels'),
    },
    {
      label: 'Generic 8.5 x 5.5 half-sheet shipping labels',
      merchant: 'Amazon',
      url: amazonSearchUrl('8.5 x 5.5 half sheet shipping labels'),
    },
  ],
  'letter-half-sheet': [
    {
      label: 'Half-sheet shipping labels',
      merchant: 'Amazon',
      url: amazonSearchUrl('half sheet shipping labels 8.5 x 5.5'),
    },
  ],
  'ol131-8x5': [
    {
      label: '8 x 5 shipping labels',
      merchant: 'Amazon',
      url: amazonSearchUrl('8 x 5 shipping labels'),
    },
    {
      label: 'OnlineLabels OL131 compatible labels',
      merchant: 'Amazon',
      url: amazonSearchUrl('OL131 shipping labels'),
    },
  ],
  'ol145-wl145-6x4': [
    {
      label: '6 x 4 two-up shipping labels',
      merchant: 'Amazon',
      url: amazonSearchUrl('6 x 4 shipping labels 2 per sheet'),
    },
    {
      label: 'OnlineLabels OL145 compatible labels',
      merchant: 'Amazon',
      url: amazonSearchUrl('OL145 shipping labels'),
    },
  ],
  'avery-5292-5454': [
    {
      label: 'Avery 5292 4 x 6 shipping labels',
      merchant: 'Amazon',
      url: amazonSearchUrl('Avery 5292 shipping labels'),
    },
    {
      label: 'Avery 5454 4 x 6 shipping labels',
      merchant: 'Amazon',
      url: amazonSearchUrl('Avery 5454 shipping labels'),
    },
  ],
  'thermal-4x6': [
    {
      label: '4 x 6 thermal shipping labels',
      merchant: 'Amazon',
      url: amazonSearchUrl('4 x 6 thermal shipping labels'),
    },
    {
      label: '4 x 6 fanfold shipping labels',
      merchant: 'Amazon',
      url: amazonSearchUrl('4 x 6 fanfold shipping labels'),
    },
  ],
  'letter-full-page': [
    {
      label: 'Full-sheet shipping labels',
      merchant: 'Amazon',
      url: amazonSearchUrl('full sheet shipping labels 8.5 x 11'),
    },
  ],
}

export const getAffiliateLinksForTemplate = (templateId: string) =>
  AFFILIATE_LINKS_BY_TEMPLATE[templateId] ?? []
