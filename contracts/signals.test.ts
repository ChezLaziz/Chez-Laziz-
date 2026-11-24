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

  describe('la première raison d\'annulation', () => {
    const annulations = (rows: { code: string | null; orders: number }[]) =>
      buildSignals(
        overview({
          delivery: { completed: 30, cancelled: 10, cancellationRate: 0.2, lostRevenueMillimes: 45000 },
          cancellations: { rows },
        }),
      ).find((x) => x.id === 'cancellations')!.text

    it('est nommée, avec son compte, quand elle explique au moins un tiers des annulations', () => {
      const texte = annulations([
        { code: 'sans_reponse', orders: 6 },
        { code: 'change_avis', orders: 3 },
        { code: 'trop_cher', orders: 0 },
        { code: 'faux_numero', orders: 1 },
      ])
      expect(texte).toContain('Première raison notée : « ne répond pas », 6 sur 10.')
      // Le chiffre d'avant reste : la raison s'ajoute, elle ne remplace rien.
      expect(texte).toContain('20%')
      expect(texte).toContain('45')
    })

    it('ne dépend pas de l\'ordre des lignes', () => {
      const texte = annulations([
        { code: null, orders: 2 },
        { code: 'trop_cher', orders: 1 },
        { code: 'faux_numero', orders: 7 },
      ])
      expect(texte).toContain('« faux numéro », 7 sur 10')
    })

    it('se tait sous un tiers des annulations : ce serait une anecdote', () => {
      const texte = annulations([
        { code: 'sans_reponse', orders: 3 },
        { code: 'change_avis', orders: 3 },
        { code: 'trop_cher', orders: 2 },
        { code: 'faux_numero', orders: 2 },
      ])
      expect(texte).not.toContain('Première raison')
    })

    it('se tait sous trois commandes, même quand elles pèsent plus du tiers', () => {
      // Deux annulations sur cinq : 40 %, et pourtant deux commandes ne font
      // pas une raison. Sur cinq annulations, rien n'est encore lisible.
      const texte = buildSignals(
        overview({
          delivery: { completed: 20, cancelled: 5, cancellationRate: 0.2, lostRevenueMillimes: 45000 },
          cancellations: {
            rows: [
              { code: 'sans_reponse', orders: 2 },
              { code: 'change_avis', orders: 1 },
              { code: null, orders: 2 },
            ],
          },
        }),
      ).find((x) => x.id === 'cancellations')!.text
      expect(texte).toContain('20%')
      expect(texte).not.toContain('Première raison')
    })

    it('« raison non notée » n\'est jamais une raison, même quand c\'est la plus grosse ligne', () => {
      const texte = annulations([
        { code: null, orders: 6 },
        { code: 'change_avis', orders: 4 },
      ])
      expect(texte).toContain('« a changé d\'avis », 4 sur 10')
      expect(texte).not.toContain('non notée')
    })

    it('se passe des raisons quand la source ne les donne pas', () => {
      const sans = buildSignals(
        overview({ delivery: { completed: 30, cancelled: 10, cancellationRate: 0.2, lostRevenueMillimes: 45000 } }),
      ).find((x) => x.id === 'cancellations')!.text
      expect(sans).not.toContain('Première raison')
      expect(sans.endsWith('perdu.')).toBe(true)
    })
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

describe('buildSignals — une publicité qui tourne sans étiquette', () => {
  const ads = (recentUntaggedMetaVisits: number, recentTaggedVisits: number) => ({
    ads: { recentUntaggedMetaVisits, recentTaggedVisits },
  })

  it('le dit avec les deux nombres, et dit depuis quand', () => {
    const signals = buildSignals(overview(ads(412, 388)))
    expect(signals).toHaveLength(1)
    expect(signals[0]!.id).toBe('ads-untagged')
    expect(signals[0]!.tone).toBe('bad')
    expect(signals[0]!.text).toContain('Depuis hier, 412 visites')
    expect(signals[0]!.text).toContain('contre 388 avec')
  })

  it("parle le jour du lancement, avant même dix commandes", () => {
    // Le seuil de volume ferait taire ce signal au moment précis où il
    // sert : la publicité amène du monde, les commandes n'ont pas suivi.
    const signals = buildSignals(overview({ orders: trend(2, 0), ...ads(300, 0) }))
    expect(signals.map((s) => s.id)).toEqual(['ads-untagged'])
  })

  it('voit une publicité sans étiquette même quand une autre, étiquetée, prend le gros du budget', () => {
    // Deux publicités, une sur quatre des visites sans étiquette.
    expect(buildSignals(overview(ads(455, 1327)))).toHaveLength(1)
  })

  it('se tait sur le fond de visites que le site reçoit toujours', () => {
    // Une publication de la page, un lien partagé : quelques dizaines par jour.
    expect(buildSignals(overview(ads(149, 0)))).toEqual([])
    expect(buildSignals(overview(ads(60, 20)))).toEqual([])
  })

  it('se tait quand ce fond est noyé dans les visites étiquetées', () => {
    // 150 à côté de 3 000 : une visite Meta sur vingt, rien ne tourne à nu.
    expect(buildSignals(overview(ads(150, 3000)))).toEqual([])
    // Une sur dix, c'est la limite.
    expect(buildSignals(overview(ads(150, 1351)))).toEqual([])
    expect(buildSignals(overview(ads(150, 1350)))).toHaveLength(1)
  })

  it("se tait quand les visites ne sont pas comptées", () => {
    expect(buildSignals(overview())).toEqual([])
    expect(buildSignals(overview(ads(0, 0)))).toEqual([])
  })

  it("s'ajoute aux autres signaux sans les remplacer", () => {
    const signals = buildSignals(
      overview({ revenueMillimes: trend(150000, 100000), ...ads(500, 100) }),
    )
    expect(signals.map((s) => s.id)).toEqual(['ads-untagged', 'revenue'])
  })
})
