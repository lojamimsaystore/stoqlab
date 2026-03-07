"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

type DashboardShellProps = {
  children: React.ReactNode;
  tenantName: string;
  userName: string;
};

export function DashboardShell({
  children,
  tenantName,
  userName,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        tenantName={tenantName}
        userName={userName}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
