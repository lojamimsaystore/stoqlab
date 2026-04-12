"use client";

import { createContext, useContext } from "react";
import type { ActionKey } from "./action-permissions";

type PermissionsContextValue = {
  /** Verifica se o usuário pode executar uma ação ou ver uma informação */
  can: (key: ActionKey) => boolean;
};

const PermissionsContext = createContext<PermissionsContextValue>({
  can: () => true, // fallback seguro: owner sempre pode tudo
});

export function PermissionsProvider({
  children,
  permissions,
}: {
  children: React.ReactNode;
  permissions: string[];
}) {
  const set = new Set(permissions);
  const can = (key: ActionKey) => set.has(key);

  return (
    <PermissionsContext.Provider value={{ can }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionsContext);
}
