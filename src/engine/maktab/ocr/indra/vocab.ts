/** CTC vocabulary from Indra `meta.json` (`vocab.py` decode path). Class 0 is blank. */

export class Vocab {
  readonly chars: readonly string[]
  readonly index: ReadonlyMap<string, number>
  readonly hasCommands: boolean
  readonly jamo: boolean
  readonly spaceId: number | null

  constructor(chars: readonly string[]) {
    this.chars = chars
    this.index = new Map(chars.map((ch, i) => [ch, i + 1]))
    this.hasCommands = chars.some((ch) => ch.length > 1)
    this.jamo = this.index.has('\u1100')
    this.spaceId = this.index.get(' ') ?? null
  }

  static fromJson(raw: string): Vocab {
    const parsed = JSON.parse(raw) as { blank?: number; chars?: unknown }
    if ((parsed.blank ?? 0) !== 0) {
      throw new Error('only blank=0 vocabularies are supported')
    }
    if (!Array.isArray(parsed.chars) || parsed.chars.some((ch) => typeof ch !== 'string')) {
      throw new Error('vocab json has no chars array')
    }
    return new Vocab(parsed.chars)
  }

  decode(ids: readonly number[]): string {
    const tokens: string[] = []
    for (const id of ids) {
      if (id > 0 && id <= this.chars.length) tokens.push(this.chars[id - 1])
    }
    if (this.jamo) return tokens.join('').normalize('NFC')
    if (!this.hasCommands) return tokens.join('')
    let out = ''
    for (let k = 0; k < tokens.length; k++) {
      const token = tokens[k]
      out += token
      const next = tokens[k + 1] ?? ''
      if (
        token.length > 2 &&
        token.startsWith('\\') &&
        /^[A-Za-z]+$/.test(token.slice(1)) &&
        /^[A-Za-z]/.test(next)
      ) {
        out += ' '
      }
    }
    return out
  }
}
