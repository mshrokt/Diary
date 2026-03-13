"use client";

import { useAuth } from "@/hooks/useAuth";
import { getDiaries } from "@/lib/db";
import { Diary } from "@/types/diary";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { PenSquare, Calendar, ChevronRight, BookOpen, Sparkles } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const { user, loginWithGoogle } = useAuth();
  const router = useRouter();
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      const fetchDiaries = async () => {
        try {
          const data = await getDiaries(user.uid);
          setDiaries(data);
        } catch (error) {
          console.error("Failed to load diaries", error);
        } finally {
          setLoading(false);
        }
      };
      fetchDiaries();
    } else {
      setLoading(false);
    }
  }, [user]);

  if (!user) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-4 min-h-screen relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-accent/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-light/5 rounded-full blur-3xl"></div>
        </div>

        <div className="animate-slide-up text-center space-y-8 max-w-sm w-full relative z-10">
          {/* Logo */}
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-xl animate-float">
              <BookOpen className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold gradient-text tracking-tight">
                My Diary
              </h1>
              <p className="text-muted mt-2 text-sm leading-relaxed">
                いつでも、どこでも、あなたの想いを記録
              </p>
            </div>
          </div>

          {/* Login Card */}
          <div className="bg-card rounded-3xl p-8 shadow-xl border border-border">
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 text-xs font-medium text-muted mb-2">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                すべてのデバイスで同期
                <Sparkles className="w-3.5 h-3.5 text-accent" />
              </div>
              <button
                onClick={loginWithGoogle}
                className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-primary to-primary-light hover:opacity-90 text-white font-semibold py-3.5 px-6 rounded-2xl transition-all shadow-lg hover:shadow-xl active:scale-[0.98] btn-glow cursor-pointer"
              >
                <svg className="w-5 h-5 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  <path fill="none" d="M1 1h22v22H1z" />
                </svg>
                Googleでログイン
              </button>
            </div>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2 text-xs">
            <span className="px-3 py-1.5 rounded-full bg-surface border border-border text-muted">🔒 安全な暗号化</span>
            <span className="px-3 py-1.5 rounded-full bg-surface border border-border text-muted">📱 マルチデバイス</span>
            <span className="px-3 py-1.5 rounded-full bg-surface border border-border text-muted">✨ 完全無料</span>
          </div>
        </div>
      </main>
    );
  }

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    const weekday = weekdays[d.getDay()];
    return { month, day, weekday, full: `${d.getFullYear()}年${month}月${day}日（${weekday}）` };
  };

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto w-full px-5 pb-8">
        <div className="flex items-center justify-between mb-6 mt-6 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">あなたの日記</h1>
            <p className="text-muted text-sm mt-1">
              {diaries.length > 0 ? `${diaries.length}件の記録` : "新しい一日を始めましょう"}
            </p>
          </div>
          <button
            onClick={() => router.push("/edit/new")}
            className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary-light hover:opacity-90 text-white px-5 py-2.5 rounded-2xl transition-all shadow-lg hover:shadow-xl font-medium text-sm cursor-pointer active:scale-[0.97] btn-glow"
          >
            <PenSquare className="w-4 h-4" />
            日記を書く
          </button>
        </div>

        {loading ? (
          <div className="space-y-4 mt-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-2xl bg-surface border border-border p-5 animate-pulse"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="flex gap-4">
                  <div className="w-14 h-14 rounded-xl bg-border/50"></div>
                  <div className="flex-1 space-y-3 py-1">
                    <div className="h-3 bg-border/50 rounded-full w-1/4"></div>
                    <div className="h-3 bg-border/50 rounded-full w-3/4"></div>
                    <div className="h-3 bg-border/50 rounded-full w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : diaries.length === 0 ? (
          <div className="text-center py-20 animate-slide-up">
            <div className="w-20 h-20 rounded-2xl bg-surface border-2 border-dashed border-border flex items-center justify-center mx-auto mb-5">
              <BookOpen className="w-8 h-8 text-muted/50" />
            </div>
            <h3 className="text-lg font-semibold mb-2">まだ日記がありません</h3>
            <p className="text-muted text-sm max-w-xs mx-auto leading-relaxed">
              「日記を書く」ボタンから、最初のできごとを記録しましょう！
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {diaries.map((diary, index) => {
              const dateInfo = formatDate(diary.date);
              return (
                <Link
                  key={diary.id}
                  href={`/edit/${diary.id}`}
                  className={`group block rounded-2xl bg-card border border-border card-hover animate-fade-in opacity-0`}
                  style={{ animationDelay: `${index * 0.06}s`, animationFillMode: "forwards" }}
                >
                  <div className="flex items-start gap-4 p-4">
                    {/* Date badge */}
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 dark:from-primary/20 dark:to-accent/20 flex flex-col items-center justify-center shrink-0 border border-primary/10">
                      <span className="text-lg font-bold text-primary leading-none">{dateInfo.day}</span>
                      <span className="text-[10px] font-medium text-muted mt-0.5">{dateInfo.month}月 {dateInfo.weekday}</span>
                    </div>

                    {/* Content preview */}
                    <div className="flex-1 min-w-0 py-0.5">
                      <p className="text-sm text-foreground line-clamp-2 leading-relaxed">
                        {diary.content}
                      </p>
                    </div>

                    {/* Arrow */}
                    <div className="pt-3 shrink-0">
                      <ChevronRight className="w-4 h-4 text-muted/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
