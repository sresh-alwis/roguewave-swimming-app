"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationItems } from "@/lib/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="app-sidebar">
      <h2 className="app-sidebar-title">ROGUEWAVE</h2>
      <p className="app-sidebar-subtitle">Coaching Management</p>
      <nav className="app-sidebar-nav" aria-label="Main navigation">
        {navigationItems.map((item) => {
          const isActive = pathname.startsWith(item.matchPrefix);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`app-nav-link${isActive ? " app-nav-link-active" : ""}`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
