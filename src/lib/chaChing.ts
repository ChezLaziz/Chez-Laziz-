// Le « cha-ching » de la caisse, fabriqué par le navigateur.
//
// Pas de fichier audio, et c'est délibéré : un .mp3 hébergé, c'est une
// requête réseau de plus qui peut échouer (le stockage d'images l'a déjà
// prouvé ici), une licence à vérifier, et un octet perdu = plus aucun son.
// Deux oscillateurs et une enveloppe ne peuvent pas tomber en panne.
//
// La forme du son : un petit choc métallique, puis deux notes brillantes qui
// montent — ce que l'oreille reconnaît comme un tiroir-caisse.
//
// LE NAVIGATEUR REFUSE DE JOUER AVANT UN GESTE HUMAIN. C'est une règle
// d'autoplay qu'on ne contourne pas : la page demande donc une pression une
// fois, à l'ouverture, et garde le contexte audio ouvert pour la journée.

type Ctor = typeof AudioContext;

let ctx: AudioContext | null = null;

function creerContexte(): AudioContext | null {
  const C: Ctor | undefined =
    window.AudioContext ?? (window as { webkitAudioContext?: Ctor }).webkitAudioContext;
  if (!C) return null;
  try {
    return new C();
  } catch {
    return null;
  }
}

/** À appeler depuis un vrai clic. Retourne false si le navigateur ne veut
 * pas de son du tout — la page doit alors le DIRE, pas faire semblant. */
export async function activerSon(): Promise<boolean> {
  ctx ??= creerContexte();
  if (!ctx) return false;
  try {
    // Suspendu tant qu'aucun geste n'a eu lieu ; ce « resume » est ce que le
    // geste autorise.
    if (ctx.state === "suspended") await ctx.resume();
    return ctx.state === "running";
  } catch {
    return false;
  }
}

export function sonActif(): boolean {
  return ctx?.state === "running";
}

/** Une cloche : une sinusoïde et sa quinte, qui s'éteignent ensemble. */
function cloche(audio: AudioContext, freq: number, debut: number, duree: number, volume: number) {
  for (const [rapport, part] of [
    [1, 1],
    [1.5, 0.45],
    [2.98, 0.22],
  ] as const) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "sine";
    osc.frequency.value = freq * rapport;
    // Attaque très courte puis décroissance exponentielle : c'est la
    // décroissance qui fait « métal » plutôt que « bip ».
    gain.gain.setValueAtTime(0.0001, debut);
    gain.gain.exponentialRampToValueAtTime(volume * part, debut + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, debut + duree);
    osc.connect(gain).connect(audio.destination);
    osc.start(debut);
    osc.stop(debut + duree + 0.02);
  }
}

/** Le choc du tiroir : un souffle très bref, filtré haut. */
function choc(audio: AudioContext, debut: number) {
  const n = Math.floor(audio.sampleRate * 0.05);
  const buffer = audio.createBuffer(1, n, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 3;
  const src = audio.createBufferSource();
  src.buffer = buffer;
  const filtre = audio.createBiquadFilter();
  filtre.type = "highpass";
  filtre.frequency.value = 2400;
  const gain = audio.createGain();
  gain.gain.value = 0.22;
  src.connect(filtre).connect(gain).connect(audio.destination);
  src.start(debut);
}

/** Joue la caisse. Ne lève jamais : un son raté ne doit pas casser l'écran
 * qui affiche la commande — c'est l'affichage qui compte, le son l'accompagne. */
export function jouerChaChing(): void {
  if (!ctx || ctx.state !== "running") return;
  try {
    const t = ctx.currentTime + 0.02;
    choc(ctx, t);
    // Deux notes qui montent : mi puis si, l'intervalle qu'on entend dans
    // toutes les caisses enregistreuses.
    cloche(ctx, 1318.5, t, 0.5, 0.3);
    cloche(ctx, 1975.5, t + 0.11, 0.85, 0.26);
  } catch {
    // ignoré : voir ci-dessus
  }
}
