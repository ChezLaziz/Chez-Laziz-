import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { queryClient, trpc, trpcClient } from "./trpc";

// Le composant vit seul dans ce fichier : le rechargement à chaud de Vite
// ne fonctionne que pour un module qui n'exporte que des composants, et
// `trpc` (les hooks) doit rester importable partout sans lui.
export function TRPCProvider({ children }: { children: ReactNode }) {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
