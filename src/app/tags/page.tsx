"use client";

import { useAuth } from "@/hooks/useAuth";
import { getDiaries } from "@/lib/db";
import { renameTag, deleteTag } from "@/lib/tags";
import { Diary } from "@/types/diary";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { ArrowLeft, Tag, Edit2, Trash2, Loader2, Save, X, Search } from "lucide-react";
import Link from "next/link";

export default function TagManagement() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [processing, setProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/");
      return;
    }

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
  }, [user, authLoading, router]);

  const tagData = useMemo(() => {
    const counts: Record<string, number> = {};
    diaries.forEach(d => {
      d.tags?.forEach(t => {
        counts[t] = (counts[t] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [diaries]);

  const filteredTags = tagData.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRename = async (oldName: string) => {
    if (!user || !newName.trim() || newName === oldName) {
      setEditingTag(null);
      return;
    }
    setProcessing(true);
    try {
      await renameTag(user.uid, oldName, newName.trim());
      // Refresh data localy
      setDiaries(prev => prev.map(d => ({
        ...d,
        tags: d.tags?.map(t => t === oldName ? newName.trim() : t)
      })));
      setEditingTag(null);
    } catch (error) {
      console.error("Failed to rename tag", error);
      alert("タグの変更に失敗しました");
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (tagName: string) => {
    if (!user || !confirm(`タグ「${tagName}」をすべての件から削除しますか？`)) return;
    setProcessing(true);
    try {
      await deleteTag(user.uid, tagName);
      setDiaries(prev => prev.map(d => ({
        ...d,
        tags: d.tags?.filter(t => t !== tagName)
      })));
    } catch (error) {
      console.error("Failed to delete tag", error);
      alert("タグの削除に失敗しました");
    } finally {
      setProcessing(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto w-full px-5 pb-12 animate-fade-in">
        <div className="flex items-center justify-between py-6">
          <Link href="/" className="flex items-center gap-2 text-muted hover:text-foreground transition-all group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-sm font-medium">戻る</span>
          </Link>
          <h1 className="text-xl font-bold text-foreground">タグ管理</h1>
          <div className="w-10"></div>
        </div>

        <div className="space-y-6">
          {/* Search Tags */}
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-focus-within:text-primary transition-colors" />
            <input 
              type="text"
              placeholder="タグを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-card border border-border rounded-2xl py-3 pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm">
            {filteredTags.length === 0 ? (
              <div className="p-12 text-center text-muted">
                <Tag className="w-12 h-12 mx-auto mb-3 opacity-10" />
                <p className="text-sm">タグが見つかりません</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredTags.map((tag) => (
                  <div key={tag.name} className="flex items-center justify-between p-4 group hover:bg-surface/50 transition-colors">
                    {editingTag === tag.name ? (
                      <div className="flex-1 flex items-center gap-2 pr-4">
                        <input
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          className="flex-1 bg-surface border border-primary rounded-xl px-3 py-1.5 text-sm outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRename(tag.name);
                            if (e.key === "Escape") setEditingTag(null);
                          }}
                        />
                        <button 
                          onClick={() => handleRename(tag.name)}
                          disabled={processing}
                          className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        >
                          {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        </button>
                        <button 
                          onClick={() => setEditingTag(null)}
                          className="p-1.5 text-muted hover:bg-surface rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 flex items-center gap-3">
                          <Link 
                            href={`/?tag=${encodeURIComponent(tag.name)}`}
                            className="flex-1 flex items-center gap-3 group/item"
                          >
                            <div className="p-2 bg-primary/5 rounded-lg text-primary group-hover/item:bg-primary group-hover/item:text-white transition-colors">
                              <Tag className="w-4 h-4" />
                            </div>
                            <div className="text-sm font-semibold flex items-center gap-2 group-hover/item:text-primary transition-colors">
                                {tag.name}
                                <span className="text-[10px] font-medium text-muted bg-surface border border-border px-1.5 py-0.5 rounded-md">
                                    {tag.count}
                                </span>
                            </div>
                          </Link>
                        </div>
                        <div className="flex items-center gap-1 show-on-hover">
                          <button
                            onClick={() => {
                              setEditingTag(tag.name);
                              setNewName(tag.name);
                            }}
                            className="p-2 text-muted hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                            title="名前を変更"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(tag.name)}
                            className="p-2 text-muted hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all"
                            title="削除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
