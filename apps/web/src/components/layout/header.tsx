"use client";

import { useState, useCallback } from "react";
import { Menu, Bell, Maximize2, Minimize2, LogOut, Settings, User, AlertTriangle, Package } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/app/(dashboard)/actions";
import Link from "next/link";

const ROLE_LABELS: Record<string, string> = {
  owner: "Proprietário",
  manager: "Gerente",
  seller: "Vendedor",
  stock_operator: "Estoquista",
  master: "Master Admin",
};

type LowStockItem = {
  id: string;
  quantity: number;
  productName: string;
  color: string;
  size: string;
  locationName: string;
};

type HeaderProps = {
  onMenuClick: () => void;
  userName: string;
  userEmail: string;
  userRole: string;
  lowStockItems?: LowStockItem[];
  lowStockThreshold?: number;
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

export function Header({ onMenuClick, userName, userEmail, userRole, lowStockItems = [], lowStockThreshold = 5 }: HeaderProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const lowStockCount = lowStockItems.length;

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 shrink-0 print:hidden">
      <button
        onClick={onMenuClick}
        aria-label="Abrir menu"
        className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
      >
        <Menu size={20} />
      </button>

      <div className="ml-auto flex items-center gap-1">
        {/* Fullscreen */}
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
          aria-label={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
          className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>

        {/* Notificações */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Notificações"
              className="relative p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <Bell size={18} className={lowStockCount > 0 ? "text-amber-500" : ""} />
              {lowStockCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold leading-none text-white">
                  {lowStockCount > 99 ? "99+" : lowStockCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center gap-2">
              <Bell size={14} />
              Notificações
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {lowStockCount === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center text-slate-400">
                <Package size={28} className="text-slate-300" />
                <p className="text-sm">Nenhum alerta de estoque</p>
              </div>
            ) : (
              <>
                <div className="px-3 py-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <AlertTriangle size={13} className="shrink-0" />
                    {lowStockCount} item{lowStockCount !== 1 ? "s" : ""} com estoque baixo (até {lowStockThreshold} unidades)
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {lowStockItems.map((item) => (
                    <DropdownMenuItem key={item.id} asChild>
                      <Link
                        href="/estoque"
                        className="flex items-start gap-3 px-3 py-2.5 cursor-pointer"
                      >
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                          <AlertTriangle size={13} className="text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{item.productName}</p>
                          <p className="text-xs text-slate-500 truncate">
                            {item.color} · {item.size} · {item.locationName}
                          </p>
                        </div>
                        <span className="shrink-0 mt-0.5 text-sm font-bold text-amber-600">
                          {item.quantity}
                        </span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/estoque" className="justify-center text-xs text-blue-600 font-medium py-2">
                    Ver todo o estoque →
                  </Link>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Separador */}
        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Avatar + dropdown do usuário */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Menu do usuário"
              className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs bg-blue-600 text-white">
                  {getInitials(userName)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-slate-800 leading-none">{userName}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-none">
                  {ROLE_LABELS[userRole] ?? userRole}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="font-medium text-slate-900 truncate">{userName}</p>
              <p className="text-xs text-slate-400 font-normal truncate mt-0.5">{userEmail}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/configuracoes" className="flex items-center gap-2">
                <User size={14} />
                Meu perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/configuracoes" className="flex items-center gap-2">
                <Settings size={14} />
                Configurações
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="flex items-center gap-2 text-red-600 focus:bg-red-50 focus:text-red-600 cursor-pointer"
              onSelect={() => logoutAction()}
            >
              <LogOut size={14} />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
