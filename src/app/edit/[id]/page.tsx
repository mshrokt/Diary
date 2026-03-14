"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { createDiary, getDiaries, updateDiary, deleteDiary } from "@/lib/db";
import { Diary } from "@/types/diary";
import { storage } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { ArrowLeft, Save, Trash2, Calendar as CalendarIcon, Loader2, Tag, History, ChevronRight, Image as ImageIcon, X } from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

export default function EditDiary() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const idStr = params?.id as string;
  const isNew = idStr === "new";

  const [content, setContent] = useState("");
  const [date, setDate] = useState<number>(Date.now());
  const [tagsInput, setTagsInput] = useState("");
  const [lastYearDiary, setLastYearDiary] = useState<Diary | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null); // For single image legacy (not used for new)
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push("/");
      return;
    }

    const fetchDiaries = async () => {
      try {
        const allDiaries = await getDiaries(user.uid);
        
        // 1. Fetch current diary if not new
        if (!isNew) {
          const found = allDiaries.find((d) => d.id === idStr);
          if (found) {
            setContent(found.content);
            setDate(found.date);
            setTagsInput(found.tags?.join(" ") || "");
            setImageUrls(found.imageUrls || (found.imageUrl ? [found.imageUrl] : []));
          } else {
            router.push("/");
            return;
          }
        }

        // 2. Check for "One Year Ago" diary based on selected date
        const selectedDate = new Date(date);
        const lyYear = selectedDate.getFullYear() - 1;
        const lyMonth = selectedDate.getMonth();
        const lyDay = selectedDate.getDate();

        const lyDiary = allDiaries.find((d) => {
          const dDate = new Date(d.date);
          return (
            dDate.getFullYear() === lyYear &&
            dDate.getMonth() === lyMonth &&
            dDate.getDate() === lyDay
          );
        });
        setLastYearDiary(lyDiary || null);

      } catch (error) {
        console.error("Error fetching diaries:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDiaries();
  }, [user, authLoading, isNew, idStr, router, date]);

  const handleSave = async () => {
    if (!user || !content.trim()) return;
    setSaving(true);
    setUploadProgress(null);
    
    const tags = Array.from(new Set(tagsInput.split(/\s+/).filter(t => t.trim() !== "")));

    try {
      let finalImageUrls = [...imageUrls];

      if (imageFiles.length > 0) {
        for (const file of imageFiles) {
          const fileRef = ref(storage, `diaries/${user.uid}/${Date.now()}_${file.name}`);
          const uploadTask = uploadBytesResumable(fileRef, file);

          const downloadURL = await new Promise<string>((resolve, reject) => {
            uploadTask.on(
              "state_changed",
              (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(Math.round(progress));
              },
              (error) => {
                console.error("Upload error:", error);
                reject(error);
              },
              async () => {
                const url = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(url);
              }
            );
          });
          finalImageUrls.push(downloadURL);
        }
      }

      if (isNew) {
        await createDiary(user.uid, content, date, tags, finalImageUrls);
      } else {
        await updateDiary(idStr, content, date, tags, finalImageUrls);
      }
      router.push("/");
      router.refresh();
    } catch (error: any) {
      console.error("Error saving diary:", error);
      let errorMsg = "保存に失敗しました。";
      if (error.code === 'storage/unauthorized') {
        errorMsg += "画像のアップロード権限がありません。FirebaseのStorageルールを確認してください。";
      } else if (error.code === 'storage/canceled') {
        errorMsg += "アップロードがキャンセルされました。";
      } else {
        errorMsg += "もう一度お試しください。";
      }
      alert(errorMsg);
    } finally {
      setSaving(false);
      setUploadProgress(null);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const MAX_IMAGES = 5;
    
    if (imageUrls.length + imageFiles.length + files.length > MAX_IMAGES) {
      alert(`画像は最大${MAX_IMAGES}枚までです。`);
      return;
    }

    if (files.length > 0) {
      setImageFiles(prev => [...prev, ...files]);
      
      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeExistingImage = (index: number) => {
    setImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const removeNewImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleDelete = async () => {
    if (!confirm("この日記を削除してもよろしいですか？")) return;
    setDeleting(true);
    try {
      await deleteDiary(idStr);
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Error deleting diary:", error);
      alert("削除に失敗しました。もう一度お試しください。");
      setDeleting(false);
    }
  };

  const dateStr = new Date(date).toISOString().split("T")[0];

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

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto w-full px-5 flex flex-col h-[calc(100vh-4rem)] animate-fade-in">
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
            {!isNew && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center justify-center p-2.5 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all duration-200 disabled:opacity-50 active:scale-90 cursor-pointer"
                aria-label="日記を削除"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !content.trim()}
              className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary-light text-white px-5 py-2.5 rounded-2xl font-medium text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:opacity-90 active:scale-[0.97] btn-glow cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{uploadProgress !== null ? `${uploadProgress}%` : "保存中..."}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>保存</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Editor card */}
        <div className="bg-card rounded-3xl border border-border shadow-sm flex-1 flex flex-col min-h-0 mb-6 overflow-hidden">
          {/* Date picker */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
            <div className="p-2 bg-gradient-to-br from-primary/10 to-accent/10 dark:from-primary/20 dark:to-accent/20 rounded-xl">
              <CalendarIcon className="w-4 h-4 text-primary" />
            </div>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => {
                const newDate = new Date(e.target.value);
                if (!isNaN(newDate.getTime())) {
                  setDate(newDate.getTime());
                }
              }}
              className="bg-transparent text-base font-semibold text-foreground outline-none cursor-pointer hover:text-primary focus:text-primary transition-colors"
            />
            {isNew && (
              <span className="ml-auto text-xs font-medium text-accent bg-accent/10 px-2.5 py-1 rounded-full">
                新規
              </span>
            )}
          </div>

          {/* Image gallery preview */}
          {(imageUrls.length > 0 || imagePreviews.length > 0) && (
            <div className="mx-6 mt-4 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {/* Existing images */}
              {imageUrls.map((url, idx) => (
                <div key={`existing-${idx}`} className="relative shrink-0 w-32 aspect-square rounded-xl overflow-hidden border border-border group">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => removeExistingImage(idx)}
                    className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {/* Newly selected images */}
              {imagePreviews.map((preview, idx) => (
                <div key={`new-${idx}`} className="relative shrink-0 w-32 aspect-square rounded-xl overflow-hidden border border-primary/30 group">
                  <img src={preview} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-primary/10 pointer-events-none" />
                  <button 
                    onClick={() => removeNewImage(idx)}
                    className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Text area */}
          <div className="flex-1 flex flex-col min-h-0 p-6">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="今日のできごとや思考をここに書き留めましょう..."
              className="w-full flex-1 bg-transparent resize-none outline-none text-foreground text-base leading-[1.8] placeholder-muted/50"
              style={{ minHeight: "200px" }}
              autoFocus
            />
          </div>

          {/* Tags input */}
          <div className="px-6 py-3 border-t border-border bg-surface/30">
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-3 flex-1">
                <Tag className="w-4 h-4 text-muted shrink-0" />
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="タグを追加 (スペース区切り)"
                  className="w-full bg-transparent outline-none text-sm text-foreground placeholder-muted/40"
                />
              </div>
              
              <label className="shrink-0 flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-xl text-xs font-medium text-muted hover:text-primary hover:border-primary/40 transition-all cursor-pointer">
                <ImageIcon className="w-3.5 h-3.5" />
                <span>画像を追加</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple
                  onChange={handleImageChange}
                  className="hidden" 
                />
              </label>
            </div>
          </div>

          {/* Character count */}
          <div className="px-6 py-3 border-t border-border flex items-center justify-end">
            <span className="text-xs text-muted">
              {content.length} 文字
            </span>
          </div>
        </div>

        {/* Throwback Section */}
        {lastYearDiary && (
          <div className="animate-slide-up mt-4 pb-4">
            <h3 className="text-[10px] font-bold text-muted mb-3 flex items-center gap-2 uppercase tracking-tight">
              <History className="w-3 h-3 text-primary" />
              1年前の今日のあなた
            </h3>
            <div className="group block bg-card/40 backdrop-blur-sm border border-primary/20 rounded-2xl hover:border-primary/40 transition-all card-hover">
                <div className="flex gap-4 p-4">
                  {((lastYearDiary.imageUrls && lastYearDiary.imageUrls.length > 0) || lastYearDiary.imageUrl) && (
                    <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-border/50 relative">
                      <img src={lastYearDiary.imageUrls?.[0] || lastYearDiary.imageUrl} alt="Last year" className="w-full h-full object-cover" />
                      {(lastYearDiary.imageUrls?.length || 1) > 1 && (
                        <div className="absolute bottom-1 right-1 bg-black/50 text-white text-[8px] px-1 rounded-md backdrop-blur-sm font-bold">
                          {(lastYearDiary.imageUrls?.length || 1)}枚
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-widest mb-1">
                      <History className="w-3 h-3" />
                      1年前の今日
                    </div>
                    <p className="text-xs text-foreground/80 line-clamp-2 italic mb-2">
                      「{lastYearDiary.content}」
                    </p>
                    <Link
                      href={`/read/${lastYearDiary.id}`}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:underline"
                    >
                      詳しく読む
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
