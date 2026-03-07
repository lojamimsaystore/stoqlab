"use client";

import { useState } from "react";
import { Building2, User, MapPin, Users, CreditCard } from "lucide-react";
import { TabLoja } from "./tab-loja";
import { TabConta } from "./tab-conta";
import { TabLocalizacoes } from "./tab-localizacoes";
import { TabUsuarios } from "./tab-usuarios";
import { TabPlano } from "./tab-plano";

const TABS = [
  { id: "loja", label: "Dados da loja", icon: Building2 },
  { id: "conta", label: "Minha conta", icon: User },
  { id: "localizacoes", label: "Localizações", icon: MapPin },
  { id: "usuarios", label: "Usuários", icon: Users },
  { id: "plano", label: "Plano", icon: CreditCard },
];

export function SettingsTabs(props: {
  tenant: { id: string; name: string; plan: string; trial_ends_at: string | null; settings: Record<string, string> };
  user: { id: string; name: string; email: string; role: string };
  locations: { id: string; name: string; type: string }[];
  users: { id: string; name: string; email: string; role: string; is_active: boolean }[];
  currentUserRole: string;
}) {
  const isOwner = props.currentUserRole === "owner";
  const [active, setActive] = useState("loja");

  const visibleTabs = TABS.filter((tab) => {
    if (tab.id === "usuarios" || tab.id === "plano" || tab.id === "loja" || tab.id === "localizacoes") {
      return isOwner;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
              active === tab.id
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        {active === "loja" && <TabLoja tenant={props.tenant} />}
        {active === "conta" && <TabConta user={props.user} />}
        {active === "localizacoes" && <TabLocalizacoes locations={props.locations} />}
        {active === "usuarios" && <TabUsuarios users={props.users} currentUserId={props.user.id} />}
        {active === "plano" && <TabPlano tenant={props.tenant} />}
      </div>
    </div>
  );
}
