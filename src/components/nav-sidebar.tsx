"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe, Users, UserCircle, BookOpen, Wand2, MessageSquare, Brain, Upload, PackagePlus, Settings, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/library", label: "Library", icon: Globe },
  { href: "/characters", label: "Characters", icon: Users },
  { href: "/personas", label: "Personas", icon: UserCircle },
  { href: "/scenarios", label: "Scenarios", icon: BookOpen },
  { href: "/prompts", label: "Prompts", icon: Wand2 },
  { href: "/sessions", label: "Sessions", icon: MessageSquare },
  { href: "/memories", label: "Memories", icon: Brain },
  { href: "/import", label: "Import", icon: Upload },
  { href: "/batch-import", label: "Batch Import", icon: PackagePlus },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function NavSidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const displayName =
    user?.user_metadata?.full_name ?? user?.email ?? "User";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 left-4 z-50 rounded-lg bg-zinc-900 p-2 text-zinc-400 hover:text-zinc-100 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-zinc-900 border-r border-zinc-800 transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <Link href="/characters" className="text-xl font-bold text-zinc-100">
            RolePlay
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="rounded p-1 text-zinc-400 hover:text-zinc-100 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-zinc-800 px-4 py-4">
          <div className="flex items-center justify-between">
            <span className="truncate text-sm text-zinc-300">
              {displayName}
            </span>
            <button
              onClick={signOut}
              className="rounded p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
