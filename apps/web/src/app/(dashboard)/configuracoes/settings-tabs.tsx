"use client";

import { useState } from "react";
import { Building2, User, MapPin, Users, CreditCard, Info, ShieldCheck } from "lucide-react";
import { TabLoja } from "./tab-loja";
import { TabConta } from "./tab-conta";
import { TabLocalizacoes } from "./tab-localizacoes";
import { TabUsuarios } from "./tab-usuarios";
import { TabPlano } from "./tab-plano";
import { TabInformacoes } from "./tab-informacoes";
import { TabPermissoes } from "./tab-permissoes";
import type { ActionKey } from "@/lib/action-permissions";

const TABS = [
  { id: "loja",         label: "Dados da loja",  icon: Building2  },
  { id: "informacoes",  label: "Informações",     icon: Info       },
  { id: "conta",        label: "Minha conta",     icon: User       },
  { id: "localizacoes", label: "Localizações",    icon: MapPin     },
  { id: "usuarios",     label: "Usuários",        icon: Users      },
  { id: "permissoes",   label: "Permissões",      icon: ShieldCheck },
  { id: "plano",        label: "Plano",           icon: CreditCard },
];

export function SettingsTabs(props: {
  tenant: { id: string; name: string; plan: string; trial_ends_at: string | null; settings: Record<string, unknown> };
  user: { id: string; name: string; email: string; role: string };
  locations: { id: string; name: string; type: string }[];
  users: { id: string; name: string; email: string; role: string; is_active: boolean; confirmed: boolean }[];
  currentUserRole: string;
  savedActionPermissions?: Record<string, ActionKey[]>;
}) {
  const isOwner = props.currentUserRole === "owner";
  const [active, setActive] = useState("loja");

  const OWNER_ONLY_TABS = new Set(["loja", "informacoes", "localizacoes", "usuarios", "permissoes", "plano"]);
  const visibleTabs = TABS.filter((tab) =>
    OWNER_ONLY_TABS.has(tab.id) ? isOwner : true
  );

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
        {active === "loja"         && <TabLoja tenant={props.tenant} />}
        {active === "informacoes"  && <TabInformacoes settings={props.tenant.settings} />}
        {active === "conta" && <TabConta user={props.user} />}
        {active === "localizacoes" && <TabLocalizacoes locations={props.locations} />}
        {active === "usuarios" && <TabUsuarios users={props.users} currentUserId={props.user.id} />}
        {active === "permissoes" && <TabPermissoes savedActionPermissions={props.savedActionPermissions} />}
        {active === "plano" && <TabPlano tenant={props.tenant} />}
      </div>
    </div>
  );
}
