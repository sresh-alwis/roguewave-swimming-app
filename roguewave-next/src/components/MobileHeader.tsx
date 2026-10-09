"use client";

import { usePathname } from "next/navigation";
import { navigationItems } from "@/lib/navigation";

export default function MobileHeader() {
  const pathname = usePathname();

  return (
    <header className="app-mobile-header">
      <span className="app-mobile-header-title">RogueWave</span>
      <span className="app-mobile-header-section">
        {navigationItems.find((item) => pathname.startsWith(item.matchPrefix))?.label ?? ""}
      </span>
    </header>
  );
}
