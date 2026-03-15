"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, BookOpen, Sun, Moon, Bell, BellOff, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { saveSubscription, deleteSubscription } from "@/lib/db";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const [isDark, setIsDark] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<"default" | "granted" | "denied" | "unsupported">("default");
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    const isDarkStored = localStorage.getItem("theme") === "dark";
    if (isDarkStored) {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    }

    if (!("Notification" in window)) {
      setNotificationStatus("unsupported");
    } else {
      setNotificationStatus(Notification.permission as any);
      // Check if already subscribed to push
      if (Notification.permission === "granted") {
        navigator.serviceWorker.ready.then(reg => {
          reg.pushManager.getSubscription().then(sub => {
            setIsSubscribed(!!sub);
          });
        });
      }
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

  const handleNotificationToggle = async () => {
    if (!user || isSubscribing) return;
    setIsSubscribing(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      
      if (isSubscribed) {
        // Unsubscribe
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await deleteSubscription(user.uid, subscription.endpoint);
          await subscription.unsubscribe();
        }
        setIsSubscribed(false);
        alert("20時の通知リマインダーをオフにしました。");
      } else {
        // Subscribe
        const permission = await Notification.requestPermission();
        setNotificationStatus(permission);
        
        if (permission !== "granted") {
          setIsSubscribing(false);
          return;
        }

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

        await saveSubscription(user.uid, subscription.toJSON());
        setIsSubscribed(true);
        alert("20時の通知リマインダーをオンにしました！");
      }
    } catch (error) {
      console.error("Failed to toggle notifications:", error);
      alert("通知の設定に失敗しました。ブラウザの設定を確認してください。");
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <nav className="w-full glass border-b border-border sticky top-0 z-50 pt-[calc(2px+env(safe-area-inset-top))]">
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
          {user && notificationStatus !== "unsupported" && (
            <div className="flex items-center gap-1">
              <button
                onClick={handleNotificationToggle}
                disabled={isSubscribing}
                className={`p-2.5 rounded-xl transition-all duration-200 active:scale-90 ${
                  isSubscribed 
                  ? "text-primary bg-primary/10" 
                  : "text-muted hover:bg-surface-hover"
                }`}
                title={isSubscribed ? "通知オン（クリックでオフ）" : "20時に通知を送る"}
              >
                {isSubscribing ? (
                  <Loader2 className="w-[18px] h-[18px] animate-spin" />
                ) : isSubscribed ? (
                  <Bell className="w-[18px] h-[18px]" />
                ) : (
                  <BellOff className="w-[18px] h-[18px]" />
                )}
              </button>
              {isSubscribed && (
                <button
                  onClick={async () => {
                    const reg = await navigator.serviceWorker.ready;
                    reg.showNotification("テスト通知", {
                      body: "これが表示されれば、端末の設定はOKです！",
                      icon: "/icon-192x192.png"
                    });
                  }}
                  className="text-[10px] font-bold px-2 py-1 bg-gray-100 rounded-md text-gray-500 hover:bg-gray-200 transition-colors"
                >
                  TEST
                </button>
              )}
            </div>
          )}
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
