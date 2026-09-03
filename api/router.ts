import { createRouter, publicQuery } from "./middleware";
import { productsRouter } from "./productsRouter";
import { ordersRouter } from "./ordersRouter";
import { contactRouter, adminRouter } from "./contactRouter";
import { statsRouter } from "./statsRouter";
import { socialRouter } from "./socialRouter";
import { dashboardRouter } from "./dashboardRouter";
import { galleryRouter } from "./galleryRouter";
import { contentRouter } from "./contentRouter";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  products: productsRouter,
  orders: ordersRouter,
  contact: contactRouter,
  admin: adminRouter,
  stats: statsRouter,
  social: socialRouter,
  dashboard: dashboardRouter,
  gallery: galleryRouter,
  content: contentRouter,
});

export type AppRouter = typeof appRouter;
