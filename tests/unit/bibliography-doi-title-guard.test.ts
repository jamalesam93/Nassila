import { describe, expect, it } from 'vitest'
import { bibliographySupportsRegistryTitle } from '../../src/engine/manuscript/verify'

const REF_8_RAW =
  '[8] Alshakka M, Aldubhani A, Basaleem H, Hassali MA, Izham M, Ibrahim M. Importance of incorporating social pharmacy education in Yemeni pharmacy schools curriculum. J Pharm Policy Pract 2021;14:1–9. https://doi.org/10.1186/s40545-021-00300-3.'

const PPRI_TITLE =
  'Addressing the medicines access challenge through balance, evidence, collaboration and transparency: key take-away lessons of the 4th PPRI Conference'

const REF_7_RAW =
  '[7] Alshakka M, Mohamed Izham MI, Awsan B, Wafa F.S. B, Shankar PR. An insight into the pharmaceutical sector in Yemen during conflict: challenges and recommendations. Med Confl Surviv 2020;36:232–48. https://doi.org/10.1080/13623699.2020.1794287.'

const REF_7_TITLE = 'An insight into the pharmaceutical sector in Yemen during conflict: challenges and recommendations'

describe('bibliographySupportsRegistryTitle', () => {
  it('rejects PPRI registry title against ref [8] social-pharmacy bibliography line', () => {
    expect(bibliographySupportsRegistryTitle(REF_8_RAW, PPRI_TITLE)).toBe(false)
  })

  it('accepts matching registry title against ref [7] bibliography line', () => {
    expect(bibliographySupportsRegistryTitle(REF_7_RAW, REF_7_TITLE)).toBe(true)
  })
})
