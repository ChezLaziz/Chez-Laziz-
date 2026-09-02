import { createRouter, publicQuery } from "./middleware";
import { productsRouter } from "./productsRouter";
import { ordersRouter } from "./ordersRouter";
import { contactRouter, adminRouter } from "./contactRouter";
import { statsRouter } from "./statsRouter";
import { socialRouter } from "./socialRouter";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  products: productsRouter,
  orders: ordersRouter,
  contact: contactRouter,
  admin: adminRouter,
  stats: statsRouter,
  social: socialRouter,
});

export type AppRouter = typeof appRouter;
