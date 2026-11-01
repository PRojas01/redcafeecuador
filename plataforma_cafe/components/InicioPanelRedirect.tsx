"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, getStoredSession, setStoredSession, type ApiUser } from "@/lib/api";

export function InicioPanelRedirect() {
  const router = useRouter();

  useEffect(() => {
    const local = getStoredSession();
    if (local) {
      router.replace("/panel");
      return;
    }

    api.me().then((r) => {
      if (!r.ok || !r.data) return;
      const data = r.data as { user: ApiUser | null; requires_2fa?: boolean };
      if (data.user && !data.requires_2fa) {
        setStoredSession(data.user, true);
        router.replace("/panel");
      }
    });
  }, [router]);

  return null;
}
