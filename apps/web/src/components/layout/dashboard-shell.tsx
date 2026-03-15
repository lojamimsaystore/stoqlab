"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { moduleFromPath } from "@/lib/permissions";

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

  // Route guard: redirect to dashboard if current module is not allowed
  useEffect(() => {
    if (userRole === "owner" || userRole === "master") return;
    const module = moduleFromPath(pathname);
    if (module && !userPermissions.includes(module)) {
      router.replace("/");
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
        userRole={userRole}
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
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 print:overflow-visible print:p-0">{children}</main>
      </div>
    </div>
  );
}
