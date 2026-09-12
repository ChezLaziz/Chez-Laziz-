import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { randomBytes } from "node:crypto";
import sharp from "sharp";

function getClient(): { client: S3Client; bucket: string } {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error(
      "Stockage d'images non configuré (variables R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET manquantes).",
    );
  }
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return { client, bucket };
}

/** Diagnostic lancé UNE SEULE FOIS par processus, au premier échec de
 * lecture. « Access Denied » est ambigu chez R2 comme chez S3 : il signifie
 * soit des droits insuffisants, soit un objet (ou un seau) qui n'existe pas
 * quand le jeton n'a pas le droit de lister. Un listage tranche entre les
 * deux, et sans cette réponse toute correction serait une devinette.
 *
 * Rien de secret n'est écrit : le nom du seau et l'identifiant de compte
 * apparaissent déjà dans chaque URL R2, et la clé d'accès n'est donnée que
 * par son préfixe, assez pour reconnaître un jeton remplacé. La clé SECRÈTE
 * n'est jamais touchée. */
let diagnosticDone = false;
async function diagnoseOnce(): Promise<void> {
  if (diagnosticDone) return;
  diagnosticDone = true;
  const bucket = process.env.R2_BUCKET ?? "(absent)";
  const accountId = process.env.R2_ACCOUNT_ID ?? "(absent)";
  const keyId = process.env.R2_ACCESS_KEY_ID ?? "";
  console.error(
    `[r2-diag] seau="${bucket}" compte="${accountId}" ` +
      `cléAccès="${keyId.slice(0, 6)}…" (${keyId.length} caractères)`,
  );
  try {
    const { client } = getClient();
    const res = await client.send(
      new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 5 }),
    );
    const keys = (res.Contents ?? []).map((o) => o.Key).filter(Boolean);
    console.error(
      `[r2-diag] listage OK — ${res.KeyCount ?? 0} objet(s) : ${keys.join(", ") || "(seau vide)"}`,
    );
  } catch (err) {
    console.error(
      `[r2-diag] listage refusé : ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

// Grande photo de téléphone (souvent 3000-4000px de large, 5-20 Mo) →
// recadrée à une taille d'affichage réelle et réencodée en JPEG. Sans ça,
// une photo trop lourde ralentit le site pour chaque visiteur, exactement
// le problème déjà réglé pour les images du thème (voir hero.webp).
// Le dossier site/ (bandeau pleine largeur du pied de page) garde plus de
// définition que les vignettes produits/galerie.
export type UploadFolder = "products" | "gallery" | "site";
const MAX_DIMENSION: Record<UploadFolder, number> = { products: 1600, gallery: 1600, site: 2400 };
const JPEG_QUALITY = 82;

export async function uploadProductImage(
  file: File,
  folder: UploadFolder = "products",
): Promise<string> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Format d'image non supporté (jpg, png ou webp uniquement).");
  }
  if (file.size > 20 * 1024 * 1024) {
    throw new Error("Image trop lourde (20 Mo maximum).");
  }
  const inputBytes = new Uint8Array(await file.arrayBuffer());
  let outputBytes: Buffer;
  try {
    outputBytes = await sharp(inputBytes)
      .rotate() // applique l'orientation EXIF (photos de téléphone) avant le resize
      .resize({
        width: MAX_DIMENSION[folder],
        height: MAX_DIMENSION[folder],
        fit: "inside",
        withoutEnlargement: true,
      })
      .flatten({ background: "#ffffff" }) // PNG transparent -> fond blanc (le JPEG n'a pas de canal alpha)
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer();
  } catch {
    throw new Error("Image illisible — essayez une autre photo.");
  }
  const { client, bucket } = getClient();
  const key = `${folder}/${Date.now()}-${randomBytes(6).toString("hex")}.jpg`;
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: outputBytes,
      ContentType: "image/jpeg",
    }),
  );
  return key;
}
export async function getUploadedImage(
  key: string,
): Promise<{ body: ReadableStream; contentType: string } | null> {
  const { client, bucket } = getClient();
  try {
    const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!res.Body) return null;
    return {
      body: res.Body.transformToWebStream(),
      contentType: res.ContentType ?? "application/octet-stream",
    };
  } catch (err) {
    // Un échec silencieux (bucket/permissions/objet manquant) est
    // indiscernable d'une image jamais envoyée. Une ligne dans les
    // journaux, sans secret, rend la cause visible au prochain incident.
    console.error(`[r2] lecture échouée pour ${key}:`, err instanceof Error ? err.message : err);
    void diagnoseOnce();
    return null;
  }
}

/** Écrit un objet quelconque dans le seau — utilisé par la sauvegarde
 * automatique de la base. Sépare volontairement des photos : pas de sharp,
 * pas de redimensionnement, pas de limite de 20 Mo pensée pour un téléphone. */
export async function putObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  const { client, bucket } = getClient();
  await client.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }),
  );
}

/** La taille de l'objet tel qu'il est RÉELLEMENT stocké, ou null s'il n'y est
 * pas. Une écriture qui ne lève pas n'est pas une écriture réussie : c'est
 * précisément cette confusion qui a laissé les photos disparaître sans un
 * seul message d'erreur. Une sauvegarde qu'on n'a pas relue n'est pas une
 * sauvegarde. */
export async function objectSize(key: string): Promise<number | null> {
  const { client, bucket } = getClient();
  try {
    const res = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return res.ContentLength ?? null;
  } catch {
    return null;
  }
}
