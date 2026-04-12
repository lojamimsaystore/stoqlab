"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { moduleFromPath, MODULES } from "@/lib/permissions";
import { PermissionsProvider } from "@/lib/permissions-context";

type LowStockItem = {
  id: string;
  quantity: number;
  productName: string;
  color: string;
  size: string;
  locationName: string;
};

type DashboardShellProps = {
  children: React.ReactNode;
  tenantName: string;
  userName: string;
  userRole: string;
  userEmail: string;
  lowStockItems?: LowStockItem[];
  lowStockThreshold?: number;
  userPermissions?: string[];
  userActionPermissions?: string[];
  sidebarColor?: string;
  sidebarFontColor?: string;
};

export function DashboardShell({
  children,
  tenantName,
  userName,
  userRole,
  userEmail,
  lowStockItems = [],
  lowStockThreshold = 5,
  userPermissions = [],
  userActionPermissions = [],
  sidebarColor,
  sidebarFontColor,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Persist sidebar collapse state
  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored !== null) setCollapsed(stored === "true");
  }, []);

  // Route guard: redireciona para o primeiro módulo permitido se acessar um bloqueado
  useEffect(() => {
    if (userRole === "owner" || userRole === "master") return;
    const currentModule = moduleFromPath(pathname);
    if (currentModule && !userPermissions.includes(currentModule)) {
      const modulePathMap: Record<string, string> = {
        dashboard: "/", produtos: "/produtos", categorias: "/categorias",
        estoque: "/estoque", compras: "/compras", vendas: "/vendas",
        transferencias: "/transferencias", fornecedores: "/fornecedores",
        clientes: "/clientes", relatorios: "/relatorios", configuracoes: "/configuracoes",
      };
      const firstAllowed = MODULES.map((m) => m.key).find((k) => userPermissions.includes(k));
      router.replace(firstAllowed ? (modulePathMap[firstAllowed] ?? "/") : "/login");
    }
  }, [pathname, userPermissions, userRole, router]);

  function handleToggleCollapse() {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden print:block print:h-auto print:overflow-visible">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        tenantName={tenantName}
        userName={userName}
        collapsed={collapsed}
        onToggleCollapse={handleToggleCollapse}
        userPermissions={userPermissions}
        userActionPermissions={userActionPermissions}
        userRole={userRole}
        sidebarColor={sidebarColor}
        sidebarFontColor={sidebarFontColor}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-200">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          userName={userName}
          userEmail={userEmail}
          userRole={userRole}
          lowStockItems={lowStockItems}
          lowStockThreshold={lowStockThreshold}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 print:overflow-visible print:p-0">
          <PermissionsProvider permissions={userActionPermissions}>
            {children}
          </PermissionsProvider>
        </main>
      </div>
    </div>
  );
}
