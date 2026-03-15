"use client";

import { useAuth } from "@/hooks/useAuth";
import { getDiaries } from "@/lib/db";
import { Diary } from "@/types/diary";
import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Calendar from "@/components/Calendar";
import { PenSquare, Calendar as CalendarIcon, ChevronRight, BookOpen, Sparkles, Search, Tag, X, History } from "lucide-react";
import Link from "next/link";

import { getDailyHint } from "@/data/dailyHints";
import { onSnapshot, query, collection, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function Home() {
  const { user, loading: authLoading, loginWithGoogle } = useAuth();
  const router = useRouter();
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);

  const todayHint = useMemo(() => getDailyHint(new Date()), []);
  const searchParams = useSearchParams();
  const initialTag = searchParams.get("tag");

  useEffect(() => {
    if (initialTag) {
      setSelectedTag(initialTag);
    }
  }, [initialTag]);

  useEffect(() => {
    if (user) {
      const q = query(
        collection(db, "diaries"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Diary[];
        setDiaries(data);
        setLoading(false);
      }, (error) => {
        console.error("Failed to load diaries", error);
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      setLoading(false);
    }
  }, [user]);

  const { filteredDiaries, diaryData, allTags, lastYearDiary, topTags, actualTags } = useMemo<{
    filteredDiaries: Diary[];
    diaryData: Map<string, { intensity: number; id: string; preview: string; hasImage: boolean }>;
    allTags: string[];
    lastYearDiary: Diary | null;
    topTags: { name: string; count: number }[];
    actualTags: string[];
  }>(() => {
    const dataMap = new Map<string, { intensity: number; id: string; preview: string; hasImage: boolean }>();
    const tagSet = new Set<string>();
    const tagCounts: Record<string, number> = {};
    
    // Calculate "One Year Ago" target
    const now = new Date();
    const thirtyDaysAgo = now.getTime() - (30 * 24 * 60 * 60 * 1000);
    const lyYear = now.getFullYear() - 1;
    const lyMonth = now.getMonth();
    const lyDay = now.getDate();
    let lyFound: Diary | null = null;

    const filtered = diaries.filter((d) => {
      // 1. Collect tags and count frequencies
      d.tags?.forEach(t => {
        tagSet.add(t);
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      });

      // 2. Simple keyword extraction from content
      // Extract words that are likely nouns (2+ chars for Kanji/Katakana, 3+ for Hiragana/English)
      const words = d.content.match(/([一-龠]{2,}|[ァ-ヶ]{2,}|[ぁ-ん]{3,}|[a-zA-Z]{3,})/g) || [];
      const stopWords = [
        // Common grammatical / functional words
        "から", "ので", "した", "です", "ます", "など", "こと", "もの", "ため", "よう", "みたい",
        "感じ", "思った", "書いた", "でした", "される", "ている", "ところ", "という", "そして",
        "しかし", "だった", "なくて", "けれど", "ななめ", "あした", "きょう", "昨日",
        // Common adverbs / adjectives / vague words
        "本当", "結構", "普通", "最近", "今日", "明日", "自分", "全然", "絶対", "多分",
        "やっぱり", "やはり", "すごい", "すごく", "とても", "かなり", "ちょっと", "少し",
        "たくさん", "いろいろ", "やっぱ", "めっちゃ", "まあまあ",
        // Common verbs / verb-like expressions
        "思う", "考える", "行った", "行く", "来た", "見た", "見る", "食べた", "食べる",
        "出来", "出来る", "出た", "入った", "知った", "言った", "言う", "使った", "使う",
        "始めた", "終わった", "続けた", "帰った", "帰る", "買った", "作った", "持った",
        "なった", "なる", "ある", "いる", "する", "できる", "やる", "もらう", "くれる",
        // Time / generic nouns
        "時間", "今回", "前回", "部分", "場所", "意味", "理由", "結果", "状態", "状況",
        "方法", "問題", "関係", "必要", "可能", "大丈夫", "大変", "一番", "最初", "最後",
        "気持ち", "程度", "以上", "以下", "以前", "以降", "途中", "毎日", "毎回",
        "今年", "去年", "来年", "今月", "先月", "来月", "今週", "先週", "来週",
        "午前", "午後", "夕方", "朝方", "日中",
        // Pronouns / demonstratives
        "それ", "これ", "あれ", "ここ", "そこ", "あそこ", "どこ",
        "その", "この", "あの", "どの", "そう", "こう", "ああ", "どう",
        // Conjunctions / particles
        "だから", "それで", "でも", "けど", "ただ", "また", "もう", "まだ", "ずっと",
        "一応", "とりあえず",
      ];
      
      const isRecent = d.date >= thirtyDaysAgo;
      
      words.forEach(w => {
          if (!isRecent) return; // Only count keywords from the last 30 days
          if (stopWords.some(sw => w.includes(sw) || sw.includes(w))) return;
          // Avoid words that end with common verb suffixes if they are hiragana-heavy
          if (w.length <= 3 && /[ぁ-ん]$/.test(w)) return;
          
          tagCounts[w] = (tagCounts[w] || 0) + 0.5; // Keywords have lower weight than explicit tags
      });

      // 3. Build calendar data (intensity based on character count)
      const dt = new Date(d.date);
      const isLastYearToday = dt.getFullYear() === lyYear && dt.getMonth() === lyMonth && dt.getDate() === lyDay;
      if (isLastYearToday) lyFound = d;

      const dateStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
      const current = dataMap.get(dateStr) || { intensity: 0, id: d.id!, preview: "", hasImage: false };
      
      const contentPreview = d.content.length > 40 ? d.content.substring(0, 40) + "..." : d.content;
      
      dataMap.set(dateStr, {
        intensity: current.intensity + d.content.length,
        id: d.id!, // Last entry id for that date is used for navigation
        preview: current.preview ? current.preview + "\n---\n" + contentPreview : contentPreview,
        hasImage: !!current.hasImage || !!(d.images && d.images.length > 0),
      });

      // Filter logic
      const matchesSearch = d.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTag = !selectedTag || d.tags?.includes(selectedTag);
      const matchesKeyword = !selectedKeyword || d.content.toLowerCase().includes(selectedKeyword.toLowerCase());
      return matchesSearch && matchesTag && matchesKeyword;
    });

    // Sort tags/keywords by frequency
    const sortedTags = Object.entries(tagCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 items

    return {
      filteredDiaries: filtered,
      diaryData: dataMap,
      allTags: Array.from(tagSet).sort(),
      lastYearDiary: lyFound,
      topTags: sortedTags,
      actualTags: Array.from(tagSet).sort()
    };
  }, [diaries, searchQuery, selectedTag, selectedKeyword]);

  const handleCalendarDateClick = (dateStr: string) => {
    const info = diaryData.get(dateStr);
    if (info) {
      router.push(`/read/${info.id}`);
    }
  };

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
    return { month, day, weekday };
  };

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto w-full px-5 pb-12">
        {/* Subtle Header / Today's Hint */}
        {!searchQuery && !selectedTag ? (
          <div className="mb-3 mt-4 animate-fade-in">
            <div className="px-6 pt-4 pb-3 group">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[10px] font-medium text-muted">
                      {(() => {
                        const now = new Date();
                        const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
                        return `${now.getMonth() + 1}月${now.getDate()}日(${weekdays[now.getDay()]})`;
                      })()}
                    </span>
                    {todayHint.target && (
                      <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                        {todayHint.target}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-medium text-muted bg-surface px-2 py-0.5 rounded-full border border-border">
                    計 {diaries.length}件の記録
                  </span>
                </div>
                
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h1 className="text-lg font-bold text-foreground leading-tight">
                      {todayHint.question}
                    </h1>

                  </div>
                  <button 
                    onClick={() => router.push("/edit/new")}
                    className="shrink-0 flex items-center gap-2 bg-primary/10 hover:bg-primary text-primary hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer border border-primary/20"
                  >
                    <PenSquare className="w-3.5 h-3.5" />
                    書く
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
            <div className="mb-4 mt-4 animate-fade-in">
               <h1 className="text-2xl font-bold text-foreground mb-1">
                検索・フィルタ結果
              </h1>
              <p className="text-muted text-sm">
                {selectedTag && `タグ: #${selectedTag} `}
                {selectedKeyword && `キーワード: ${selectedKeyword} `}
                {searchQuery && `検索: ${searchQuery} `}
                に一致する日記を表示しています
              </p>
            </div>
        )}

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
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Search and Tags */}
            <div className="grid gap-4 animate-fade-in">
                {/* Search Bar */}
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-focus-within:text-primary transition-colors" />
                    <input 
                        type="text"
                        placeholder="日記を検索..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-card border border-border rounded-2xl py-3 pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                    {searchQuery && (
                        <button 
                            onClick={() => setSearchQuery("")}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-surface rounded-full transition-colors"
                        >
                            <X className="w-3 h-3 text-muted" />
                        </button>
                    )}
                </div>
            </div>

            {/* Calendar / Heatmap */}
            <Calendar
              diaryData={diaryData}
              onDateClick={handleCalendarDateClick}
            />

            {/* Tag Chips (Moved below Calendar) */}
            {actualTags.length > 0 && (
                <div className="flex flex-col gap-2 animate-fade-in">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Top Tags</span>
                        <Link 
                            href="/tags"
                            className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                        >
                            <Tag className="w-2.5 h-2.5" />
                            すべて管理
                        </Link>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                        {actualTags.slice(0, 8).map(tag => (
                            <button
                                key={tag}
                                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                                className={`
                                    flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all
                                    ${selectedTag === tag 
                                        ? "bg-primary text-white shadow-sm shadow-primary/30" 
                                        : "bg-surface border border-border text-muted hover:border-primary/40 hover:text-primary"}
                                `}
                            >
                                <Tag className="w-3 h-3" />
                                {tag}
                            </button>
                        ))}
                        {actualTags.length > 8 && (
                            <Link 
                                href="/tags"
                                className="px-3 py-1.5 rounded-xl text-xs font-medium border border-dashed border-border text-muted hover:border-primary/40 hover:text-primary transition-all"
                            >
                                +{actualTags.length - 8} more...
                            </Link>
                        )}
                    </div>
                </div>
            )}

            {/* Throwback Card */}
            {lastYearDiary && !searchQuery && !selectedTag && !selectedKeyword && (
              <div className="animate-slide-up">
                <div className="bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20 rounded-3xl p-6 relative overflow-hidden group hover:border-primary/40 transition-all">
                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-500">
                    <History className="w-24 h-24 text-primary" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest mb-4">
                      <History className="w-4 h-4" />
                      1年前の今日のあなた
                    </div>
                    <p className="text-foreground leading-relaxed italic mb-4 line-clamp-3">
                      「{lastYearDiary.content}」
                    </p>
                    
                    {/* Tags from last year */}
                    {lastYearDiary.tags && lastYearDiary.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-6">
                        <span className="text-[9px] font-bold text-muted/60 uppercase tracking-tighter self-center mr-1">当時の関心:</span>
                        {lastYearDiary.tags.map(tag => (
                          <span key={tag} className="text-[10px] font-medium text-accent bg-accent/5 px-2 py-0.5 rounded-lg border border-accent/10">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <Link
                      href={`/read/${lastYearDiary.id}`}
                      className="inline-flex items-center gap-2 bg-white dark:bg-card border border-primary/10 px-4 py-2 rounded-xl text-xs font-bold text-primary hover:bg-primary hover:text-white transition-all shadow-sm"
                    >
                      詳しく読む
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Keyword / Interests Section */}
            {topTags.length > 0 && !searchQuery && !selectedTag && (
                <div className="flex flex-col gap-2 animate-fade-in">
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Interests</span>
                    <div className="flex flex-wrap gap-x-6 gap-y-4 px-2">
                        {topTags.map((tag, idx) => (
                            <div key={tag.name} className="flex flex-col gap-1">
                                <span className="text-[10px] font-bold text-muted uppercase tracking-tighter opacity-50">Rank {idx + 1}</span>
                                <button 
                                    onClick={() => setSelectedKeyword(selectedKeyword === tag.name ? null : tag.name)}
                                    className={`text-sm font-semibold transition-colors flex items-center gap-1.5 ${selectedKeyword === tag.name ? "text-primary" : "text-foreground hover:text-primary"}`}
                                >
                                    {tag.name}
                                    <span className="text-[10px] font-medium bg-surface px-1.5 py-0.5 rounded-md border border-border">
                                        {tag.count}
                                    </span>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Diary list */}
            {filteredDiaries.length === 0 ? (
              <div className="text-center py-16 animate-slide-up bg-card rounded-3xl border border-dashed border-border/50">
                <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto mb-4">
                  <Search className="w-6 h-6 text-muted/30" />
                </div>
                <h3 className="text-base font-semibold mb-1">見つかりませんでした</h3>
                <p className="text-muted text-xs max-w-[200px] mx-auto leading-relaxed">
                  キーワードやタグ、もしくは日付を変えてみてください
                </p>
                 {(searchQuery || selectedTag || selectedKeyword) && (
                    <button 
                        onClick={() => {setSearchQuery(""); setSelectedTag(null); setSelectedKeyword(null);}}
                        className="mt-4 text-xs font-medium text-primary hover:underline"
                    >
                        フィルターをクリア
                    </button>
                )}
              </div>
            ) : (
              <div>
                <h2 className="text-sm font-semibold text-muted mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CalendarIcon className="w-3.5 h-3.5" />
                    {searchQuery || selectedTag ? "検索結果" : "最近の日記"}
                  </span>
                  <span className="text-[10px] font-medium bg-surface px-2 py-0.5 rounded-full border border-border">
                    {filteredDiaries.length}件
                  </span>
                </h2>
                <div className="space-y-4">
                  {filteredDiaries.map((diary, index) => {
                    const dateInfo = formatDate(diary.date);
                    return (
                      <Link
                        key={diary.id}
                        href={`/read/${diary.id}`}
                        className="group block rounded-2xl bg-card border border-border card-hover animate-fade-in opacity-0"
                        style={{ animationDelay: `${index * 0.05}s`, animationFillMode: "forwards" }}
                      >
                        <div className="p-5">
                            <div className="flex items-start gap-4 mb-3">
                                {/* Date badge */}
                                <div className="relative shrink-0">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 dark:from-primary/20 dark:to-accent/20 flex flex-col items-center justify-center shrink-0 border border-primary/10">
                                        <span className="text-base font-bold text-primary leading-none">{dateInfo.day}</span>
                                        <span className="text-[9px] font-medium text-muted mt-0.5">{dateInfo.month}月</span>
                                    </div>
                                    </div>

                                {/* Content preview */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex gap-4">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-foreground line-clamp-2 leading-relaxed mb-2">
                                                {diary.isDraft && (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 mr-2 border border-amber-200/50 dark:border-amber-700/30">
                                                        下書き
                                                    </span>
                                                )}
                                                {diary.content}
                                            </p>
                                        </div>
                                        {diary.images && diary.images.length > 0 && (
                                            <div className="w-16 h-16 rounded-xl overflow-hidden border border-border bg-surface shrink-0 hidden sm:block">
                                                <img src={diary.images[0]} alt="Thumbnail" className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Tags in card */}
                                    {diary.tags && diary.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5">
                                            {diary.tags.map(tag => (
                                                <span key={tag} className="text-[9px] font-medium text-primary bg-primary/5 px-2 py-0.5 rounded-lg">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Arrow */}
                                <div className="shrink-0">
                                    <ChevronRight className="w-4 h-4 text-muted/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200" />
                                </div>
                            </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}
