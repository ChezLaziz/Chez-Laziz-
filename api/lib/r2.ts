import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { randomBytes } from "node:crypto";
import sharp from "sharp";
import {
  PAYMENT_PROOF_ALLOWED_MIME,
  PAYMENT_PROOF_MAX_SIZE_BYTES,
} from "@contracts/shop";

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
// Captures d'écran D17 : taille d'écran de téléphone, 1600px suffisent largement.
const PROOF_MAX_DIMENSION = 1600;

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

// Preuve de paiement D17 (capture d'écran) — stockage séparé des photos
// produits (préfixe payment-proof/), jamais servi par la route publique
// /api/uploads/* (voir boot.ts) : uniquement accessible à l'admin via
// /api/admin/payment-proof/:key.
export async function uploadPaymentProof(file: File): Promise<string> {
  if (!PAYMENT_PROOF_ALLOWED_MIME.has(file.type)) {
    throw new Error("Format d'image non supporté (jpg, png ou webp uniquement).");
  }
  if (file.size > PAYMENT_PROOF_MAX_SIZE_BYTES) {
    throw new Error("Image trop lourde (8 Mo maximum).");
  }
  const inputBytes = new Uint8Array(await file.arrayBuffer());
  let outputBytes: Buffer;
  try {
    outputBytes = await sharp(inputBytes)
      .rotate()
      .resize({ width: PROOF_MAX_DIMENSION, height: PROOF_MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer();
  } catch {
    throw new Error("Image illisible — essayez une autre capture d'écran.");
  }
  const { client, bucket } = getClient();
  const key = `payment-proof/${Date.now()}-${randomBytes(6).toString("hex")}.jpg`;
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

/** Vrai seulement si la clé existe réellement dans le stockage — empêche un
 * client malveillant d'envoyer une clé inventée pour contourner l'obligation
 * de preuve de paiement D17. */
export async function paymentProofExists(key: string): Promise<boolean> {
  if (!/^payment-proof\/[a-zA-Z0-9_-]+\.jpg$/.test(key)) return false;
  const result = await getUploadedImage(key);
  return result !== null;
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
  } catch {
    return null;
  }
}
