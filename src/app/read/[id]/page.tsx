"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { getDiaries, deleteDiary } from "@/lib/db";
import { Diary } from "@/types/diary";
import { ArrowLeft, PenSquare, Trash2, Calendar, Loader2 } from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

export default function ReadDiary() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const idStr = params?.id as string;

  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push("/");
      return;
    }

    const fetchDiaries = async () => {
      try {
        const allDiaries = await getDiaries(user.uid);
        const targetDiary = allDiaries.find((d) => d.id === idStr);
        
        if (targetDiary) {
          // Normalize date to YYYY-MM-DD for grouping
          const targetDateStr = new Date(targetDiary.date).toISOString().split("T")[0];
          
          const sameDayDiaries = allDiaries
            .filter((d) => new Date(d.date).toISOString().split("T")[0] === targetDateStr)
            .sort((a, b) => a.date - b.date); // Sort by sub-day time

          setDiaries(sameDayDiaries);
        } else {
          router.push("/");
        }
      } catch (error) {
        console.error("Error fetching diary:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDiaries();
  }, [user, authLoading, idStr, router]);

  const handleDelete = async (id: string) => {
    if (!confirm("この日記を削除してもよろしいですか？")) return;
    setDeletingId(id);
    try {
      await deleteDiary(id);
      
      if (diaries.length > 1) {
        // Remove from local state if there are other entries
        setDiaries(diaries.filter(d => d.id !== id));
        router.refresh();
      } else {
        // Redirect home if it was the last entry for that day
        router.push("/");
        router.refresh();
      }
    } catch (error) {
      console.error("Error deleting diary:", error);
      alert("削除に失敗しました。");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (diaries.length === 0) return null;

  const firstDiary = diaries[0];
  const dateObj = new Date(firstDiary.date);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const formattedDate = `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日（${weekdays[dateObj.getDay()]}）`;

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto w-full px-5 pb-12 animate-fade-in">
        {/* Top bar */}
        <div className="flex items-center justify-between py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-muted hover:text-foreground transition-colors duration-200 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-200" />
            <span className="text-sm font-medium">戻る</span>
          </Link>
        </div>

        {/* Date header */}
        <div className="mb-8 mt-2">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-gradient-to-br from-primary/10 to-accent/10 dark:from-primary/20 dark:to-accent/20 rounded-xl">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">{formattedDate}</h1>
          </div>
        </div>

        {/* Diary contents - Stacked list of entries for this day */}
        <div className="space-y-6">
          {diaries.map((diary) => (
            <article key={diary.id} className="bg-card rounded-3xl border border-border shadow-sm p-6 sm:p-8 relative">
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <button
                  onClick={() => handleDelete(diary.id)}
                  disabled={deletingId === diary.id}
                  className="flex items-center justify-center p-2 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all duration-200 disabled:opacity-50 active:scale-90 cursor-pointer"
                  aria-label="日記を削除"
                >
                  {deletingId === diary.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
                <Link
                  href={`/edit/${diary.id}`}
                  className="flex items-center justify-center p-2 text-primary hover:bg-primary/10 rounded-xl transition-all duration-200 active:scale-90"
                  aria-label="日記を編集"
                >
                  <PenSquare className="w-4 h-4" />
                </Link>
              </div>

              <div className="prose-like mt-4">
                {diary.content.split("\n").map((line, i) => (
                  <p
                    key={i}
                    className={`text-base leading-[2] text-foreground ${
                      line.trim() === "" ? "h-4" : ""
                    }`}
                  >
                    {line || "\u00A0"}
                  </p>
                ))}
              </div>

              {/* Footer info */}
              <div className="mt-8 pt-4 border-t border-border flex items-center justify-between">
                <span className="text-xs text-muted">
                  {diary.content.length} 文字
                </span>
                <span className="text-xs text-muted">
                  投稿時間: {new Date(diary.date).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </article>
          ))}
        </div>
      </main>
    </>
  );
}
