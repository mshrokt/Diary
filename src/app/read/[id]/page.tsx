"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { getDiaries, deleteDiary } from "@/lib/db";
import { Diary } from "@/types/diary";
import { ArrowLeft, PenSquare, Trash2, Calendar, Loader2, Tag, History, X, Maximize2 } from "lucide-react";
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

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
              {/* Header with actions - Move to a separate flex container to avoid image overlap */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  {/* Tags in reader */}
                  {diary.tags && diary.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {diary.tags.map(tag => (
                        <span key={tag} className="flex items-center gap-1.5 text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
                          <Tag className="w-3 h-3" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDelete(diary.id)}
                    disabled={deletingId === diary.id}
                    className="flex items-center justify-center p-2 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all duration-200 disabled:opacity-50 active:scale-95 cursor-pointer"
                    aria-label="日記を削除"
                  >
                    {deletingId === diary.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                  <Link
                    href={`/edit/${diary.id}`}
                    className="flex items-center justify-center p-2 text-primary hover:bg-primary/10 rounded-xl transition-all duration-200 active:scale-95"
                    aria-label="日記を編集"
                  >
                    <PenSquare className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Images in reader */}
              {diary.images && diary.images.length > 0 && (
                <div className={`grid gap-4 mb-8 ${
                  diary.images.length === 1 ? 'grid-cols-1' : 
                  diary.images.length === 2 ? 'grid-cols-2' : 
                  'grid-cols-2 sm:grid-cols-3'
                }`}>
                  {diary.images.map((url, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => setSelectedImage(url)}
                      className={`relative rounded-3xl overflow-hidden border border-border shadow-md group/img cursor-zoom-in transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                        diary.images?.length === 1 ? 'aspect-video max-h-[400px]' : 'aspect-square'
                      }`}
                    >
                      <img 
                        src={url} 
                        alt={`Entry photo ${idx + 1}`} 
                        className="w-full h-full object-cover transition-all duration-700 group-hover/img:scale-110" 
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="bg-white/20 backdrop-blur-md p-3 rounded-full border border-white/30 transform scale-75 group-hover/img:scale-100 transition-transform duration-300">
                          <Maximize2 className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

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
              <div className="mt-8 pt-4 border-t border-border space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold text-muted uppercase tracking-widest">
                  <span>{diary.content.length} 文字</span>
                  <span>
                    投稿: {(() => {
                      const d = new Date(diary.date);
                      return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                    })()}
                  </span>
                </div>
                {diary.editHistory && diary.editHistory.length > 0 && (
                  <div className="flex flex-wrap gap-x-3 gap-y-1 opacity-40 text-[9px] font-medium text-muted">
                    {diary.editHistory.map((ts, idx) => {
                      const d = new Date(ts);
                      return (
                        <span key={idx}>
                          編集 {idx + 1}: {d.getMonth() + 1}/{d.getDate()} {String(d.getHours()).padStart(2, '0')}:{String(d.getMinutes()).padStart(2, '0')}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </main>

      {/* Lightbox Overlay */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-xl animate-fade-in cursor-zoom-out"
          onClick={() => setSelectedImage(null)}
        >
          {/* Lightbox Header */}
          <div className="flex items-center justify-end p-6 w-full z-10">
            <button 
              className="p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all active:scale-90 border border-white/20 shadow-2xl"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImage(null);
              }}
              aria-label="閉じる"
            >
              <X className="w-8 h-8" />
            </button>
          </div>
          
          {/* Image Container */}
          <div className="flex-1 overflow-hidden flex items-center justify-center p-4 sm:p-10">
            <img 
              src={selectedImage} 
              alt="Full size" 
              className="max-w-full max-h-full object-contain rounded-sm shadow-2xl animate-scale-up select-none pointer-events-none"
              style={{ filter: 'drop-shadow(0 20px 50px rgba(0,0,0,0.5))' }}
            />
          </div>
        </div>
      )}
    </>
  );
}
