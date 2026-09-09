import { describe, it, expect } from 'vitest'
import { buildSignals, type SignalInput } from './signals'

const trend = (value: number, previous: number) => ({
  value,
  previous,
  changePercent: previous === 0 ? null : ((value - previous) / previous) * 100,
})

function overview(over: Partial<SignalInput> = {}): SignalInput {
  return {
    revenueMillimes: trend(100000, 100000),
    orders: trend(50, 50),
    aovMillimes: trend(2000, 2000),
    customers: trend(40, 40),
    unitsSold: trend(100, 100),
    revenueTrend: [],
    topProducts: [],
    topGovernorates: [],
    customerSplit: {
      newCustomers: 0,
      returningCustomers: 0,
      newRevenueMillimes: 0,
      returningRevenueMillimes: 0,
      repeatOrderRate: 0,
    },
    delivery: {
      completed: 50,
      cancelled: 0,
      cancellationRate: 0,
      lostRevenueMillimes: 0,
    },
    statusCounts: {},
    ...over,
  } as SignalInput
}

describe('buildSignals — garde-fous', () => {
  it("n'émet rien sous le seuil de volume, même sur une variation énorme", () => {
    // 2 → 3 commandes, c'est « +50 % » et pourtant ce n'est que du hasard.
    const signals = buildSignals(
      overview({ orders: trend(3, 2), revenueMillimes: trend(150000, 100000) }),
    )
    expect(signals).toEqual([])
  })

  it("n'émet rien sur une variation trop faible", () => {
    const signals = buildSignals(
      overview({ orders: trend(52, 50), revenueMillimes: trend(103000, 100000) }),
    )
    expect(signals).toEqual([])
  })

  it('accepte une liste vide plutôt que de remplir la carte', () => {
    expect(buildSignals(overview())).toEqual([])
  })
})

describe('buildSignals — chaque signal porte sa preuve', () => {
  it('signale une hausse de CA avec les deux montants', () => {
    const signals = buildSignals(overview({ revenueMillimes: trend(150000, 100000) }))
    const s = signals.find((x) => x.id === 'revenue')!
    expect(s.tone).toBe('good')
    expect(s.text).toContain('50%')
    expect(s.text).toMatch(/\d/)
  })

  it('distingue une croissance par le panier d\'une croissance par le volume', () => {
    const signals = buildSignals(
      overview({ aovMillimes: trend(3000, 2000), orders: trend(35, 50) }),
    )
    const s = signals.find((x) => x.id === 'aov-vs-orders')!
    expect(s.text).toContain('Moins de commandes')
    expect(s.text).toContain('panier plus élevé')
  })

  it('alerte sur la concentration du CA sur un seul produit', () => {
    const signals = buildSignals(
      overview({
        topProducts: [
          { key: 'a', name: 'Pistache', revenueMillimes: 70000, unitsSold: 10, revenueShare: 0.7 },
          { key: 'b', name: 'Dattes', revenueMillimes: 30000, unitsSold: 5, revenueShare: 0.3 },
        ],
      }),
    )
    const s = signals.find((x) => x.id === 'product-concentration')!
    expect(s.text).toContain('Pistache')
    expect(s.text).toContain('70%')
  })

  it('ignore un gouvernorat au panier élevé mais au volume dérisoire', () => {
    const signals = buildSignals(
      overview({
        topGovernorates: [
          { governorate: 'Tunis', revenueMillimes: 80000, orders: 40, customers: 30, aovMillimes: 2000 },
          { governorate: 'Sousse', revenueMillimes: 15000, orders: 8, customers: 7, aovMillimes: 1875 },
          // Une seule commande à 9 000 DT ne fait pas un gouvernorat premium.
          { governorate: 'Gabès', revenueMillimes: 9000, orders: 1, customers: 1, aovMillimes: 9000 },
        ],
      }),
    )
    expect(signals.find((x) => x.id === 'governorate-aov')).toBeUndefined()
  })

  it('signale un gouvernorat premium quand le volume le justifie', () => {
    const signals = buildSignals(
      overview({
        topGovernorates: [
          { governorate: 'Tunis', revenueMillimes: 80000, orders: 40, customers: 30, aovMillimes: 2000 },
          { governorate: 'Sousse', revenueMillimes: 60000, orders: 20, customers: 18, aovMillimes: 3000 },
          { governorate: 'Sfax', revenueMillimes: 20000, orders: 10, customers: 9, aovMillimes: 2000 },
        ],
      }),
    )
    const s = signals.find((x) => x.id === 'governorate-aov')!
    expect(s.text).toContain('Sousse')
    expect(s.text).toContain('20 commandes')
  })

  it('chiffre le coût réel des annulations', () => {
    const signals = buildSignals(
      overview({
        delivery: {
          completed: 30,
          cancelled: 10,
          cancellationRate: 0.2,
          lostRevenueMillimes: 45000,
        },
      }),
    )
    const s = signals.find((x) => x.id === 'cancellations')!
    expect(s.tone).toBe('bad')
    expect(s.text).toContain('20%')
    expect(s.text).toContain('45')
  })

  it('ne compare nouveaux et revenants que si les deux groupes existent', () => {
    const signals = buildSignals(
      overview({
        customerSplit: {
          newCustomers: 40,
          returningCustomers: 1,
          newRevenueMillimes: 80000,
          returningRevenueMillimes: 20000,
          repeatOrderRate: 0.02,
        },
      }),
    )
    expect(signals.find((x) => x.id === 'returning-value')).toBeUndefined()
  })
})
