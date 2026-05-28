export const THRESHOLDS = {
  openalex: {
    // TODO(tune): placeholder constants; validated by fixtures under tests/fixtures/
    titleSimilarityMin: 0.92,
    yearSkewMax: 1
  },
  l3: {
    // TODO(tune): composite score bucketing thresholds
    lowMaxExclusive: 0.25,
    mediumMaxExclusive: 0.5
  },
  http: {
    // TODO(tune): used for OA and abstract retrieval
    abstractMaxBytes: 2 * 1024 * 1024,
    fullTextMaxBytes: 8 * 1024 * 1024,
    requestTimeoutMs: 15_000
  }
} as const

