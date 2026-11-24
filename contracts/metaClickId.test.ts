import { describe, expect, it } from "vitest";
import { clickIdOfFbc, fbcFromClickId, fbcToWrite, rawClickIdFromSearch } from "./metaClickId";
import { MAX_FBC_STOCKE, metaUserSignals } from "./metaSignals";

const CLIC = "IwY2xjawUPBiNwZG9mAWV4dG4DYWVtAjEwAGJyaWQRMXp6UjRrbk9xOWZ_aem_AbCdEf-123";
const VU = 1795488389001;

describe("rawClickIdFromSearch — lire le fbclid sans le transformer", () => {
  it("le trouve seul, au milieu, ou en dernier", () => {
    expect(rawClickIdFromSearch(`?fbclid=${CLIC}`)).toBe(CLIC);
    expect(rawClickIdFromSearch(`?produit=fruits-secs&fbclid=${CLIC}&utm_source=fb`)).toBe(CLIC);
    expect(rawClickIdFromSearch(`?utm_campaign=120249779868490674&fbclid=${CLIC}`)).toBe(CLIC);
  });

  it("s'arrête au fragment et au paramètre suivant", () => {
    expect(rawClickIdFromSearch(`?fbclid=${CLIC}#packs`)).toBe(CLIC);
  });

  it("ne confond pas un autre paramètre qui finit par fbclid", () => {
    expect(rawClickIdFromSearch("?xfbclid=abc")).toBeNull();
  });

  it("rend null sans fbclid, ou vide", () => {
    expect(rawClickIdFromSearch("")).toBeNull();
    expect(rawClickIdFromSearch(null)).toBeNull();
    expect(rawClickIdFromSearch("?produit=dattes")).toBeNull();
    expect(rawClickIdFromSearch("?fbclid=")).toBeNull();
  });

  it("dans le doute, rien : un fbclid encodé ou démesuré n'est pas recopié", () => {
    // « % » ou « + » : le recopier risquerait de l'altérer. Le Pixel, lui,
    // sait le lire — on le laisse faire.
    expect(rawClickIdFromSearch("?fbclid=abc%2Bdef")).toBeNull();
    expect(rawClickIdFromSearch("?fbclid=abc+def")).toBeNull();
    expect(rawClickIdFromSearch(`?fbclid=${"A".repeat(2000)}`)).toBeNull();
  });
});

describe("fbcFromClickId — le format documenté par Meta", () => {
  it("fb.1.<première vue en ms>.<fbclid>, le fbclid recopié à l'identique", () => {
    expect(fbcFromClickId(CLIC, VU)).toBe(`fb.1.${VU}.${CLIC}`);
  });

  it("ne change ni la casse ni la longueur du fbclid", () => {
    const fbc = fbcFromClickId(CLIC, VU)!;
    expect(clickIdOfFbc(fbc)).toBe(CLIC);
  });

  it("rend null plutôt qu'une valeur douteuse", () => {
    expect(fbcFromClickId("", VU)).toBeNull();
    expect(fbcFromClickId(null, VU)).toBeNull();
    expect(fbcFromClickId("abc def", VU)).toBeNull();
    expect(fbcFromClickId("abc;def", VU)).toBeNull();
    expect(fbcFromClickId(CLIC, 0)).toBeNull();
    expect(fbcFromClickId(CLIC, Number.NaN)).toBeNull();
  });
});

describe("clickIdOfFbc", () => {
  it("rend tout ce qui suit le troisième point — un fbclid peut contenir des points", () => {
    expect(clickIdOfFbc("fb.1.1719500000000.IwAR0abc")).toBe("IwAR0abc");
    expect(clickIdOfFbc("fb.1.1719500000000.abc.def.ghi")).toBe("abc.def.ghi");
  });

  it("rend null sur une valeur qui n'est pas un _fbc", () => {
    expect(clickIdOfFbc(null)).toBeNull();
    expect(clickIdOfFbc("")).toBeNull();
    expect(clickIdOfFbc("fb.1.1719500000000")).toBeNull();
    expect(clickIdOfFbc("xx.1.1719500000000.abc")).toBeNull();
  });
});

describe("fbcToWrite — quand restaurer le clic après « Accepter »", () => {
  it("pas de cookie : on écrit le clic d'arrivée", () => {
    expect(fbcToWrite({ fbclid: CLIC, firstSeenMs: VU, existingFbc: null })).toBe(`fb.1.${VU}.${CLIC}`);
  });

  it("le cookie porte déjà CE clic : on n'y touche pas, son horodatage est le bon", () => {
    expect(
      fbcToWrite({ fbclid: CLIC, firstSeenMs: VU, existingFbc: `fb.1.1795000000000.${CLIC}` }),
    ).toBeNull();
  });

  it("le cookie porte un clic plus ancien : le nouveau le remplace", () => {
    expect(
      fbcToWrite({ fbclid: CLIC, firstSeenMs: VU, existingFbc: "fb.1.1789011667795.IwAR0ancien" }),
    ).toBe(`fb.1.${VU}.${CLIC}`);
  });

  it("arrivée sans clic publicitaire : rien à écrire, même sans cookie", () => {
    expect(fbcToWrite({ fbclid: null, firstSeenMs: VU, existingFbc: null })).toBeNull();
    expect(fbcToWrite({ fbclid: undefined, firstSeenMs: VU, existingFbc: "fb.1.1.x" })).toBeNull();
  });

  it("boucle jusqu'au serveur : le cookie restauré est relu ENTIER par la commande", () => {
    const fbc = fbcToWrite({ fbclid: CLIC, firstSeenMs: VU, existingFbc: null })!;
    const signaux = metaUserSignals({ cookie: `_fbp=fb.1.${VU}.123456789; _fbc=${fbc}` });
    expect(signaux?.fbc).toBe(fbc);
    expect(clickIdOfFbc(signaux?.fbc)).toBe(CLIC);
    expect(fbc.length).toBeLessThanOrEqual(MAX_FBC_STOCKE);
  });
});
