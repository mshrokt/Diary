"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { createDiary, getDiaries, updateDiary, deleteDiary } from "@/lib/db";
import { ArrowLeft, Save, Trash2, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

export default function EditDiary() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const idStr = params?.id as string;
  const isNew = idStr === "new";

  const [content, setContent] = useState("");
  // Stored internally as a timestamp
  const [date, setDate] = useState<number>(Date.now());
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push("/");
      return;
    }

    if (!isNew) {
      const fetchDiary = async () => {
        try {
          // In a real app, you might want a getDiaryById function.
          // For simplicity here, we fetch all and find the one.
          const diaries = await getDiaries(user.uid);
          const found = diaries.find((d) => d.id === idStr);
          if (found) {
            setContent(found.content);
            setDate(found.date);
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
    }
  }, [user, isNew, idStr, router]);

  const handleSave = async () => {
    if (!user || !content.trim()) return;
    setSaving(true);
    try {
      if (isNew) {
        await createDiary(user.uid, content, date);
      } else {
        await updateDiary(idStr, content, date);
      }
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Error saving diary:", error);
      alert("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this entry?")) return;
    setDeleting(true);
    try {
      await deleteDiary(idStr);
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Error deleting diary:", error);
      alert("Failed to delete. Please try again.");
      setDeleting(false);
    }
  };

  // Convert timestamp to YYYY-MM-DD for the date input
  const dateStr = new Date(date).toISOString().split("T")[0];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto w-full p-4 flex flex-col h-[calc(100vh-3.5rem)]">
        <div className="flex items-center justify-between mb-6 mt-2">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </Link>

          <div className="flex items-center gap-3">
            {!isNew && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center justify-center p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-full transition-colors disabled:opacity-50"
                aria-label="Delete entry"
              >
                {deleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !content.trim()}
              className="flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 px-5 py-2.5 rounded-full font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm border border-transparent dark:border-gray-200"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex-1 flex flex-col min-h-0 mb-6">
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100 dark:border-gray-800">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
              <CalendarIcon className="w-5 h-5" />
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
              className="bg-transparent text-lg font-semibold text-gray-900 dark:text-white outline-none cursor-pointer hover:text-blue-500 focus:text-blue-600 transition-colors"
            />
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your thoughts here..."
            className="w-full flex-1 bg-transparent resize-none outline-none text-gray-800 dark:text-gray-200 text-lg leading-relaxed placeholder-gray-400 dark:placeholder-gray-600"
            style={{ minHeight: "200px" }}
            autoFocus
          />
        </div>
      </main>
    </>
  );
}
