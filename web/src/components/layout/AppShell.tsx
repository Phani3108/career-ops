"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Sparkles,
  FileText,
  Inbox,
  Search,
  Columns3,
  File,
  Mic,
  Layers,
  Settings,
  HeartPulse,
  GraduationCap,
  Lightbulb,
  Menu,
  X,
  Rocket,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/auto-apply", label: "Auto Apply", icon: Rocket },
  { href: "/evaluate", label: "Evaluate", icon: Sparkles },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/pipeline", label: "Pipeline", icon: Inbox },
  { href: "/scanner", label: "Scanner", icon: Search },
  { href: "/compare", label: "Compare", icon: Columns3 },
  { href: "/cv", label: "CV & PDF", icon: File },
  { href: "/interview-prep", label: "Interview Prep", icon: Mic },
  { href: "/training", label: "Training", icon: GraduationCap },
  { href: "/project", label: "Project Eval", icon: Lightbulb },
  { href: "/batch", label: "Batch", icon: Layers },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/health", label: "Health", icon: HeartPulse },
];

function NavLink({
  item,
  isActive,
  onClick,
}: {
  item: (typeof navItems)[0];
  isActive: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-gray-100 text-gray-900"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {item.label}
    </Link>
  );
}

function SidebarContent({ onItemClick }: { onItemClick?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 text-white text-xs font-bold">
          CO
        </div>
        <div>
          <h1 className="text-sm font-semibold text-gray-900">Career-Ops</h1>
          <p className="text-xs text-gray-500">Job Search Pipeline</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            isActive={
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href)
            }
            onClick={onItemClick}
          />
        ))}
      </nav>
      <div className="border-t px-4 py-3">
        <p className="text-xs text-gray-400">Local · No auth</p>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 border-r bg-gray-50/50 lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          className="fixed left-3 top-3 z-40 lg:hidden inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-56 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent onItemClick={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
