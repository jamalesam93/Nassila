export interface StyleFingerprint {
  styleId: string
  styleName: string
  category: 'author-date' | 'numeric' | 'note' | 'label'
  patterns: {
    authorFormat: RegExp
    datePattern: RegExp
    containerPattern?: RegExp
    numberedPrefix?: RegExp
    generalStructure: RegExp
  }
  weight: number
}

export const STYLE_FINGERPRINTS: StyleFingerprint[] = [
  {
    styleId: 'apa-7th',
    styleName: 'APA 7th Edition',
    category: 'author-date',
    patterns: {
      authorFormat: /^[A-Z][a-z]+,\s[A-Z]\.\s?(?:[A-Z]\.\s?)?(?:,\s|&\s|$)/,
      datePattern: /\(\d{4}[a-z]?\)/,
      containerPattern: /[A-Z][\w\s]+,?\s+\d+\s*\(\d+\)/i,
      generalStructure: /^[A-Z].+\(\d{4}\)\.\s.+\./
    },
    weight: 1.0
  },
  {
    styleId: 'ieee',
    styleName: 'IEEE',
    category: 'numeric',
    patterns: {
      authorFormat: /^[A-Z]\.\s[A-Z][a-z]+/,
      datePattern: /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{4}|\d{4}$/,
      numberedPrefix: /^\[\d+\]\s/,
      generalStructure: /^\[\d+\]\s+[A-Z]/
    },
    weight: 1.0
  },
  {
    styleId: 'vancouver',
    styleName: 'Vancouver',
    category: 'numeric',
    patterns: {
      authorFormat: /^[A-Z][a-z]+ [A-Z]{1,3}(?:,\s[A-Z][a-z]+ [A-Z]{1,3})*/,
      datePattern: /\.\s*\d{4}\s*[;:]/,
      numberedPrefix: /^\d+\.\s/,
      generalStructure: /^\d+\.\s+[A-Z].+\.\s+\d{4}/
    },
    weight: 1.0
  },
  {
    styleId: 'chicago-author-date',
    styleName: 'Chicago Author-Date',
    category: 'author-date',
    patterns: {
      authorFormat: /^[A-Z][a-z]+,\s[A-Z][a-z]+/,
      datePattern: /\.\s+\d{4}\.\s+/,
      generalStructure: /^[A-Z][a-z]+,.+\.\s+\d{4}\.\s+".+"\s/
    },
    weight: 1.0
  },
  {
    styleId: 'harvard',
    styleName: 'Harvard',
    category: 'author-date',
    patterns: {
      authorFormat: /^[A-Z][a-z]+,\s[A-Z]\.?/,
      datePattern: /\(\d{4}\)/,
      generalStructure: /^[A-Z][a-z]+.+\(\d{4}\)\s/
    },
    weight: 0.9
  },
  {
    styleId: 'mla-9th',
    styleName: 'MLA 9th Edition',
    category: 'author-date',
    patterns: {
      authorFormat: /^[A-Z][a-z]+,\s[A-Z][a-z]+/,
      datePattern: /,\s+\d{4}\s*[,.]$/,
      containerPattern: /[A-Z][\w\s]+,\s+vol\.\s+\d+/i,
      generalStructure: /^[A-Z][a-z]+,.+\.\s+".+"/
    },
    weight: 1.0
  },
  {
    styleId: 'nature',
    styleName: 'Nature',
    category: 'numeric',
    patterns: {
      authorFormat: /^[A-Z][a-z]+,\s[A-Z]\.\s?[A-Z]?\.\s?(?:&|$)/,
      datePattern: /\(\d{4}\)\s*\.?\s*$/,
      containerPattern: /[A-Z][\w.]+\s+\*?\*?\d+\*?\*?/,
      numberedPrefix: /^\d+\.\s/,
      generalStructure: /^\d+\.\s+[A-Z].+\(\d{4}\)/
    },
    weight: 1.0
  },
  {
    styleId: 'ama',
    styleName: 'AMA (American Medical Association)',
    category: 'numeric',
    patterns: {
      authorFormat: /^[A-Z][a-z]+ [A-Z]{1,2}(?:,\s[A-Z][a-z]+ [A-Z]{1,2})*/,
      datePattern: /\.\s*\d{4}\s*;/,
      numberedPrefix: /^\d+\.\s/,
      generalStructure: /^\d+\.\s+[A-Z].+\.\s+\d{4};/
    },
    weight: 1.0
  },
  {
    styleId: 'turabian',
    styleName: 'Turabian',
    category: 'note',
    patterns: {
      authorFormat: /^[A-Z][a-z]+,\s[A-Z][a-z]+/,
      datePattern: /\(\w+\s+\d{4}\)|\d{4}\)/,
      generalStructure: /^[A-Z][a-z]+,.+\.\s+.+\.\s+[A-Z]/
    },
    weight: 0.8
  }
]
