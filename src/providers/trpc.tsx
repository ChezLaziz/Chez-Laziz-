import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import superjson from "superjson";
import type { AppRouter } from "../../api/router";
import type { ReactNode } from "react";
import { ORDER_ERROR } from "@contracts/orderErrors";

export const trpc = createTRPCReact<AppRouter>();

const queryClient = new QueryClient();
const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      async fetch(input, init) {
        const res = await globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
        // Le limiteur de débit et le proxy répondent hors format tRPC : du
        // JSON à eux, ou une page HTML. superjson échouait alors à les lire
        // et le client voyait « Unable to transform response from server » —
        // de l'anglais technique, au moment de valider sa commande.
        // Constaté en pilotant un vrai navigateur. On traduit ces réponses
        // en un jeton que contracts/orderErrors.ts sait dire dans sa langue.
        if (res.status === 429) throw new Error(ORDER_ERROR.tropDeRequetes);
        return res;
      },
    }),
  ],
});

export function TRPCProvider({ children }: { children: ReactNode }) {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
