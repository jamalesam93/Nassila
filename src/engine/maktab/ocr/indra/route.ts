/**
 * Per-page choice between Indra and Paddle. Indra wins when it returns enough text;
 * a throw or a near-empty page falls back to Paddle. With no Indra, Paddle runs alone.
 */

export const MIN_ARABIC_PAGE_CHARS = 40

export async function chooseArabicPage<T extends { text: string }>(
  indra: (() => Promise<T>) | null,
  paddle: () => Promise<T>
): Promise<{ result: T; engine: 'indra' | 'paddle' }> {
  if (indra) {
    try {
      const result = await indra()
      if (result.text.trim().length >= MIN_ARABIC_PAGE_CHARS) {
        return { result, engine: 'indra' }
      }
    } catch {
      // This page falls through to Paddle.
    }
  }
  return { result: await paddle(), engine: 'paddle' }
}
