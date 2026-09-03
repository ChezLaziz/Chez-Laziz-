import { getDb } from "./connection";
import { galleryImages } from "@db/schema";
import { asc, eq } from "drizzle-orm";

export async function listGalleryImages() {
  return getDb().query.galleryImages.findMany({
    orderBy: [asc(galleryImages.sortOrder), asc(galleryImages.id)],
  });
}

export async function addGalleryImage(imageUrl: string, alt: string) {
  const existing = await listGalleryImages();
  const sortOrder = existing.length
    ? Math.max(...existing.map((g) => g.sortOrder)) + 1
    : 1;
  await getDb().insert(galleryImages).values({ imageUrl, alt, sortOrder });
}

export async function deleteGalleryImage(id: number) {
  await getDb().delete(galleryImages).where(eq(galleryImages.id, id));
}
