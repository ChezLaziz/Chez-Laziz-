import { randomBytes } from "node:crypto";
import { getDb } from "../api/queries/connection";
import { products, settings } from "./schema";
import { hashPassword } from "../api/queries/admin";

async function seed() {
  const db = getDb();
  console.log("Seeding database...");

  // --- Produits : catalogue réel de Chez Laziz ---
  const existing = await db.query.products.findMany();
  if (existing.length === 0) {
    await db.insert(products).values([
      {
        name: "Makroudh Laziz aux Dattes",
        description:
          "Le classique kairouanais : semoule fine, cœur de pâte de dattes parfumée, frit puis enrobé de miel.",
        priceMillimes: 8000,
        category: "Les classiques",
        sortOrder: 1,
      },
      {
        name: "Makroudh Jwayed",
        description:
          "Makroudh aux dattes et amandes, texture fondante, touche d'eau de fleur d'oranger.",
        priceMillimes: 9000,
        category: "Les classiques",
        sortOrder: 2,
      },
      {
        name: "Makroudh Laziz – Fruits Secs",
        description:
          "Généreusement garni d'amandes, noix et noisettes, pour les grandes occasions.",
        priceMillimes: 25000,
        category: "Les signatures",
        sortOrder: 3,
      },
      {
        name: "Makroudh Blanc à la Pistache",
        description:
          "La pièce d'exception : pâte fine et cœur de pistaches, la fierté de la maison.",
        priceMillimes: 40000,
        category: "Les signatures",
        sortOrder: 4,
      },
      {
        name: "Makroudh Goût Fraise",
        description: "La nouveauté de la maison, demandez-le en boutique.",
        priceMillimes: 10000,
        category: "Les nouveautés",
        badge: "Nouveau",
        sortOrder: 5,
      },
      {
        name: "Makroudh Enrobé Chocolat",
        description: "Le makroudh traditionnel revisité au chocolat.",
        priceMillimes: 12000,
        category: "Les nouveautés",
        badge: "Nouveau",
        sortOrder: 6,
      },
    ]);
    console.log("Products seeded.");
  } else {
    console.log("Products already exist, skipping.");
  }

  // --- Paramètres admin ---
  const pwdSetting = await db.query.settings.findFirst({
    where: (s, { eq }) => eq(s.key, "admin_password_hash"),
  });
  if (!pwdSetting) {
    // Génère un mot de passe aléatoire fort — jamais codé en dur dans le
    // code source. Affiché UNE SEULE FOIS dans les logs du serveur au
    // premier démarrage : à copier et changer immédiatement depuis /admin.
    const initialPassword =
      process.env.ADMIN_INITIAL_PASSWORD || randomBytes(9).toString("base64url");
    await db.insert(settings).values([
      {
        key: "admin_email",
        value: process.env.ADMIN_INITIAL_EMAIL || "contact@chezlaziz.com",
      },
      {
        key: "admin_password_hash",
        value: hashPassword(initialPassword),
      },
      { key: "admin_token_secret", value: randomBytes(32).toString("hex") },
    ]);
    console.log("========================================================");
    console.log(" Mot de passe admin initial (à changer immédiatement) :");
    console.log(" " + initialPassword);
    console.log("========================================================");
  } else {
    console.log("Admin settings already exist, skipping.");
  }

  console.log("Done.");
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
