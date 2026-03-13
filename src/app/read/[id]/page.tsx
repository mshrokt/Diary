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

  const [diary, setDiary] = useState<Diary | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push("/");
      return;
    }

    const fetchDiary = async () => {
      try {
        const diaries = await getDiaries(user.uid);
        const found = diaries.find((d) => d.id === idStr);
        if (found) {
          setDiary(found);
        } else {
          router.push("/");
        }
      } catch (error) {
        console.error("Error fetching diary:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDiary();
  }, [user, authLoading, idStr, router]);

  const handleDelete = async () => {
    if (!confirm("この日記を削除してもよろしいですか？")) return;
    setDeleting(true);
    try {
      await deleteDiary(idStr);
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Error deleting diary:", error);
      alert("削除に失敗しました。");
      setDeleting(false);
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

  if (!diary) return null;

  const dateObj = new Date(diary.date);
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

          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center justify-center p-2.5 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all duration-200 disabled:opacity-50 active:scale-90 cursor-pointer"
              aria-label="日記を削除"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
            <Link
              href={`/edit/${idStr}`}
              className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary-light text-white px-5 py-2.5 rounded-2xl font-medium text-sm shadow-lg hover:shadow-xl hover:opacity-90 transition-all active:scale-[0.97] btn-glow"
            >
              <PenSquare className="w-4 h-4" />
              編集
            </Link>
          </div>
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

        {/* Diary content - full text, easy to read */}
        <article className="bg-card rounded-3xl border border-border shadow-sm p-6 sm:p-8">
          <div className="prose-like">
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
              作成日: {new Date(diary.createdAt).toLocaleDateString("ja-JP")}
            </span>
          </div>
        </article>
      </main>
    </>
  );
}
