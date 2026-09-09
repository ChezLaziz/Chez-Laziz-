/** Réseaux sociaux : définitions partagées et calculs purs.
 *
 * Les chiffres viennent de relevés SAISIS À LA MAIN (voir la table
 * social_stats) : aucune API de plateforme n'est connectée. Tout ce qui est
 * calculé ici — croissance, baisses, rythme — décrit donc l'écart entre deux
 * saisies, pas une mesure continue. La fraîcheur du dernier relevé compte
 * autant que sa valeur, d'où `daysSinceReading`. */

export const NETWORK_KEYS = ["instagram", "facebook", "tiktok", "google"] as const;
export type NetworkKey = (typeof NETWORK_KEYS)[number];

/** Couleurs de série, dans un ordre FIXE — jamais recyclé, jamais réassigné
 * selon le classement : Instagram reste rose même s'il passe dernier.
 *
 * Ce ne sont pas exactement les couleurs de marque. Le noir de TikTok
 * (#111111) et le bleu de Google (#4285F4) échouaient aux contrôles : le
 * premier n'a aucune saturation et sort de la bande de luminosité, le second
 * était indistinguable du bleu Facebook pour un daltonien. Le turquoise et
 * l'ambre gardent l'association de marque tout en passant les six contrôles
 * (séparation CVD ΔE 9,1 au pire couple). */
export const NETWORKS: Record<
  NetworkKey,
  { label: string; color: string; url: string; urlLabel: string }
> = {
  instagram: {
    label: "Instagram",
    color: "#E1306C",
    url: "https://www.instagram.com/chezlaziz",
    urlLabel: "@chezlaziz",
  },
  facebook: {
    label: "Facebook",
    color: "#1877F2",
    url: "https://www.facebook.com/profile.php?id=61573444418563",
    urlLabel: "Page Chez Laziz",
  },
  tiktok: {
    label: "TikTok",
    color: "#12B0A6",
    // Recherche, pas un profil : le libellé le dit, faute de compte confirmé.
    url: "https://www.tiktok.com/search?q=chez%20laziz%20kairouan",
    urlLabel: "Recherche TikTok",
  },
  google: {
    label: "Google",
    color: "#F0A020",
    url: "https://www.google.com/maps/search/Chez+laziz+Kairouan",
    urlLabel: "Recherche Google Maps",
  },
};

/** Au-delà, un relevé ne décrit plus la situation actuelle. */
export const STALE_AFTER_DAYS = 30;

export type Reading = { followers: number; messages: number; at: string };

export type NetworkStats = {
  network: NetworkKey;
  /** null = aucun relevé pour ce réseau. */
  latest: Reading | null;
  previous: Reading | null;
  /** Variation d'abonnés depuis le relevé précédent. null s'il n'y en a qu'un :
   * un premier relevé n'est pas une croissance de zéro, c'est un point de
   * départ. */
  followersDelta: number | null;
  followersDeltaPercent: number | null;
  messagesDelta: number | null;
  /** Jours écoulés depuis le dernier relevé. null si aucun relevé. */
  daysSinceReading: number | null;
  isStale: boolean;
  /** Plus forte baisse observée entre deux relevés consécutifs, en valeur
   * absolue. 0 si le compte n'a jamais reculé. */
  worstDrop: number;
  history: Reading[];
};

export type SocialOverview = {
  networks: NetworkStats[];
  totalFollowers: number;
  /** Somme des variations, réseaux confondus. Un gain sur Instagram et une
   * perte égale sur Facebook donnent zéro — d'où le détail par réseau. */
  netFollowersDelta: number | null;
  totalMessages: number;
  /** Réseaux dont le dernier relevé montre une baisse. */
  decliningNetworks: NetworkKey[];
  /** Réseaux sans aucun relevé. */
  missingNetworks: NetworkKey[];
  /** Réseaux dont le dernier relevé date de plus de STALE_AFTER_DAYS. */
  staleNetworks: NetworkKey[];
  hasAnyData: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Construit la vue d'ensemble à partir des relevés bruts.
 *
 * `rows` peut arriver dans n'importe quel ordre : le tri est fait ici, pour
 * que la source de données n'ait pas à le garantir. */
export function buildSocialOverview(
  rows: { network: string; followers: number; messages: number; createdAt: Date | string }[],
  now: Date = new Date(),
): SocialOverview {
  const byNetwork = new Map<NetworkKey, Reading[]>();
  for (const key of NETWORK_KEYS) byNetwork.set(key, []);

  for (const r of rows) {
    const list = byNetwork.get(r.network as NetworkKey);
    if (!list) continue; // réseau inconnu : ignoré plutôt que planté
    list.push({
      followers: r.followers,
      messages: r.messages,
      at: new Date(r.createdAt).toISOString(),
    });
  }

  const networks: NetworkStats[] = NETWORK_KEYS.map((network) => {
    const history = byNetwork
      .get(network)!
      .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

    const latest = history.length > 0 ? history[history.length - 1]! : null;
    const previous = history.length > 1 ? history[history.length - 2]! : null;

    let worstDrop = 0;
    for (let i = 1; i < history.length; i++) {
      const diff = history[i]!.followers - history[i - 1]!.followers;
      if (diff < 0 && -diff > worstDrop) worstDrop = -diff;
    }

    const daysSinceReading =
      latest === null
        ? null
        : Math.max(0, Math.floor((now.getTime() - new Date(latest.at).getTime()) / DAY_MS));

    const followersDelta = latest && previous ? latest.followers - previous.followers : null;

    return {
      network,
      latest,
      previous,
      followersDelta,
      followersDeltaPercent:
        followersDelta === null || !previous || previous.followers === 0
          ? null
          : (followersDelta / previous.followers) * 100,
      messagesDelta: latest && previous ? latest.messages - previous.messages : null,
      daysSinceReading,
      isStale: daysSinceReading !== null && daysSinceReading > STALE_AFTER_DAYS,
      worstDrop,
      history,
    };
  });

  const withData = networks.filter((n) => n.latest !== null);
  const deltas = networks.map((n) => n.followersDelta).filter((d): d is number => d !== null);

  return {
    networks,
    totalFollowers: withData.reduce((s, n) => s + n.latest!.followers, 0),
    netFollowersDelta: deltas.length === 0 ? null : deltas.reduce((s, d) => s + d, 0),
    totalMessages: withData.reduce((s, n) => s + n.latest!.messages, 0),
    decliningNetworks: networks
      .filter((n) => n.followersDelta !== null && n.followersDelta < 0)
      .map((n) => n.network),
    missingNetworks: networks.filter((n) => n.latest === null).map((n) => n.network),
    staleNetworks: networks.filter((n) => n.isStale).map((n) => n.network),
    hasAnyData: withData.length > 0,
  };
}

/** Points de la courbe comparée : un axe temporel commun, une série par
 * réseau. Les réseaux sans relevé à une date donnée y sont absents (null),
 * ce qui laisse la ligne continue au lieu de la faire plonger à zéro. */
export type TrendPoint = { at: number } & Partial<Record<NetworkKey, number>>;

export function buildTrend(overview: SocialOverview): TrendPoint[] {
  const byTime = new Map<number, TrendPoint>();
  for (const n of overview.networks) {
    for (const r of n.history) {
      const at = new Date(r.at).getTime();
      const point = byTime.get(at) ?? { at };
      point[n.network] = r.followers;
      byTime.set(at, point);
    }
  }
  return Array.from(byTime.values()).sort((a, b) => a.at - b.at);
}
