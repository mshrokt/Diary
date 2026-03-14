"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, BookOpen, Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const isDarkStored = localStorage.getItem("theme") === "dark";
    if (isDarkStored) {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    }
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }
    setIsDark(!isDark);
  };

  return (
    <nav className="w-full glass border-b border-border sticky top-0 z-50 pt-[calc(4px+env(safe-area-inset-top))]">
      <div className="max-w-3xl mx-auto px-5 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2.5 group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow duration-300">
            <BookOpen className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight gradient-text">
            My Diary
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl hover:bg-surface-hover transition-all duration-200 active:scale-90"
            aria-label="テーマの切り替え"
          >
            {isDark ? (
              <Sun className="w-[18px] h-[18px] text-accent" />
            ) : (
              <Moon className="w-[18px] h-[18px] text-muted" />
            )}
          </button>
          {user && (
            <button
              onClick={logout}
              className="flex items-center gap-2 text-sm font-medium text-muted hover:text-foreground px-3 py-2 rounded-xl hover:bg-surface-hover transition-all duration-200 active:scale-95"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">ログアウト</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
