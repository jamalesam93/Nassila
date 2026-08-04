// Ambient declarations for untyped CJS dependencies.
// Keep minimal: narrow in the importing wrappers, not here.

declare module 'citeproc' {
  export class Engine {
    constructor(
      sys: { retrieveLocale: () => string; retrieveItem: (id: string) => unknown },
      styleXml: string
    )
    updateItems(ids: string[]): void
    makeBibliography(): [
      Record<string, unknown> & { bibstart: string; bibend: string; entry_ids?: string[][] },
      string[]
    ]
    previewCitationCluster(
      citation: unknown,
      citationsPre: unknown[],
      citationsPost: unknown[],
      format: string
    ): string
  }
  const CSL: { Engine: typeof Engine }
  export = CSL
}

declare module '@citation-js/core' {
  export interface CiteInstance {
    get(options: { type: string; style?: string }): unknown
  }
  export const Cite: {
    async(input: unknown, options?: { forceType?: string }): Promise<CiteInstance>
  }
}
