"use client";

import { useAuth } from "@/hooks/useAuth";
import { ReactNode } from "react";
import { Loader2 } from "lucide-react";

export default function AuthProvider({ children }: { children: ReactNode }) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return <>{children}</>;
}
