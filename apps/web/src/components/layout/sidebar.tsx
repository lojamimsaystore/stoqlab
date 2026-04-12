"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingCart,
  Tag,
  ArrowLeftRight,
  Truck,
  Users,
  BarChart3,
  X,
  FolderOpen,
  PanelLeftClose,
  PanelLeftOpen,
  Palette,
  AlertTriangle,
} from "lucide-react";
import { updateSidebarColorAction, updateSidebarFontColorAction } from "@/app/(dashboard)/actions";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";


const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/produtos", label: "Produtos", icon: Package },
  { href: "/categorias", label: "Categorias", icon: FolderOpen },
  { href: "/estoque", label: "Estoque", icon: Boxes },
  { href: "/compras", label: "Compras", icon: ShoppingCart },
  { href: "/vendas", label: "Vendas", icon: Tag },
  { href: "/transferencias", label: "Transferências", icon: ArrowLeftRight },
  { href: "/fornecedores", label: "Fornecedores", icon: Truck },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/devedores", label: "Devedores", icon: AlertTriangle },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
];

type SidebarProps = {
  open: boolean;
  onClose: () => void;
  tenantName: string;
  userName: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  userPermissions?: string[];
  userActionPermissions?: string[];
  userRole?: string;
  sidebarColor?: string;
  sidebarFontColor?: string;
};

export function Sidebar({
  open, onClose, tenantName, userName, collapsed, onToggleCollapse,
  userPermissions = [], userActionPermissions = [], userRole = "owner", sidebarColor, sidebarFontColor,
}: SidebarProps) {
  const pathname = usePathname();
  const [currentColor, setCurrentColor] = useState(sidebarColor ?? "#0f172a");
  const [currentFontColor, setCurrentFontColor] = useState(sidebarFontColor ?? "#ffffff");
  const [isPending, startTransition] = useTransition();

  function handleColorSelect(hex: string) {
    setCurrentColor(hex);
    startTransition(async () => {
      await updateSidebarColorAction(hex);
      toast.success("Cor da barra atualizada");
    });
  }

  function handleFontColorSelect(hex: string) {
    setCurrentFontColor(hex);
    startTransition(async () => {
      await updateSidebarFontColorAction(hex);
      toast.success("Cor da fonte atualizada");
    });
  }

  const visibleItems = NAV_ITEMS.filter(({ href }) => {
    if (userRole === "owner" || userRole === "master") return true;
    const key = href === "/" ? "dashboard" : href.slice(1);
    if (key === "clientes") {
      return userPermissions.includes(key) && userActionPermissions.includes("cliente.menu");
    }
    return userPermissions.includes(key);
  });

  return (
    <TooltipProvider delayDuration={0}>
      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        style={{ backgroundColor: currentColor, color: currentFontColor }}
        className={`
          fixed inset-y-0 left-0 z-30 text-white flex flex-col
          transform transition-all duration-200 ease-in-out
          lg:relative lg:translate-x-0 lg:z-auto
          print:hidden
          ${open ? "translate-x-0" : "-translate-x-full"}
          ${collapsed ? "lg:w-[60px]" : "lg:w-64"} w-64
        `}
      >
        {/* Logo */}
        <div className={`flex items-center border-b border-slate-800 h-14 shrink-0 ${collapsed ? "justify-center px-3" : "justify-between px-4"}`}>
          {!collapsed && (
            <div className="overflow-hidden flex-1 mr-2">
              <p className="font-bold text-base leading-none text-white truncate">{tenantName}</p>
            </div>
          )}
          {collapsed && (
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
              <span className="font-bold text-sm text-white">{tenantName.charAt(0).toUpperCase()}</span>
            </div>
          )}

          {/* Botão recolher — desktop */}
          <button
            onClick={onToggleCollapse}
            title={collapsed ? "Expandir menu" : "Recolher menu"}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            className={`hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors shrink-0 ${collapsed ? "mt-0" : ""}`}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>

          {/* Fechar mobile */}
          <button
            onClick={onClose}
            aria-label="Fechar menu"
            className="lg:hidden text-slate-400 hover:text-white ml-2 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {visibleItems.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);

            if (collapsed) {
              return (
                <Tooltip key={href}>
                  <TooltipTrigger asChild>
                    <Link
                      href={href}
                      onClick={onClose}
                      aria-label={label}
                      style={!active ? { color: currentFontColor } : undefined}
                      className={`
                        flex items-center justify-center w-full h-10 rounded-lg transition-colors
                        ${active ? "bg-blue-600 text-white" : "hover:bg-white/10"}
                      `}
                    >
                      <Icon size={18} className="shrink-0" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                style={!active ? { color: currentFontColor } : undefined}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${active ? "bg-blue-600 text-white" : "hover:bg-white/10"}
                `}
              >
                <Icon size={18} className="shrink-0" />
                <span>{label}</span>
                {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-2 py-3 border-t border-white/10">
          {!collapsed && (
            <div className="px-3 py-2 mb-1">
              <p className="text-sm font-medium text-white truncate">{userName}</p>
            </div>
          )}

          {/* Seletores de cor — apenas o proprietário pode editar */}
          {(userRole === "owner" || userRole === "master") && (
            collapsed ? (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <label className="flex w-full items-center justify-center h-10 rounded-lg hover:bg-white/10 transition-colors cursor-pointer" style={{ color: currentFontColor + "99" }}>
                      <Palette size={18} />
                      <input type="color" value={currentColor} onChange={(e) => handleColorSelect(e.target.value)} className="sr-only" />
                    </label>
                  </TooltipTrigger>
                  <TooltipContent side="right">Cor da barra lateral</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <label className="flex w-full items-center justify-center h-10 rounded-lg hover:bg-white/10 transition-colors cursor-pointer" style={{ color: currentFontColor + "99" }}>
                      <span className="text-xs font-bold">A</span>
                      <input type="color" value={currentFontColor} onChange={(e) => handleFontColorSelect(e.target.value)} className="sr-only" />
                    </label>
                  </TooltipTrigger>
                  <TooltipContent side="right">Cor da fonte</TooltipContent>
                </Tooltip>
              </>
            ) : (
              <>
                <label className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors cursor-pointer" style={{ color: currentFontColor + "99" }}>
                  <Palette size={16} className="shrink-0" />
                  <span>Cor da barra</span>
                  <span className="ml-auto w-4 h-4 rounded-full border-2 border-white/30 shrink-0" style={{ backgroundColor: currentColor }} />
                  <input type="color" value={currentColor} onChange={(e) => handleColorSelect(e.target.value)} className="sr-only" />
                </label>
                <label className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors cursor-pointer" style={{ color: currentFontColor + "99" }}>
                  <span className="text-base font-bold shrink-0">A</span>
                  <span>Cor da fonte</span>
                  <span className="ml-auto w-4 h-4 rounded-full border-2 border-white/30 shrink-0" style={{ backgroundColor: currentFontColor }} />
                  <input type="color" value={currentFontColor} onChange={(e) => handleFontColorSelect(e.target.value)} className="sr-only" />
                </label>
              </>
            )
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
