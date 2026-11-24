import { createRouter, publicQuery } from "./middleware";
import { productsRouter } from "./productsRouter";
import { ordersRouter } from "./ordersRouter";
import { contactRouter, adminRouter } from "./contactRouter";
import { statsRouter } from "./statsRouter";
import { carriersRouter } from "./carriersRouter";
import { dashboardRouter } from "./dashboardRouter";
import { galleryRouter } from "./galleryRouter";
import { contentRouter } from "./contentRouter";
import { suiviRouter } from "./suiviRouter";
import { offresRouter } from "./offresRouter";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  products: productsRouter,
  orders: ordersRouter,
  contact: contactRouter,
  admin: adminRouter,
  stats: statsRouter,
  carriers: carriersRouter,
  dashboard: dashboardRouter,
  gallery: galleryRouter,
  content: contentRouter,
  suivi: suiviRouter,
  offres: offresRouter,
});

export type AppRouter = typeof appRouter;
