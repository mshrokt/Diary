"use client";

import { useAuth } from "@/hooks/useAuth";
import { getDiaries } from "@/lib/db";
import { Diary } from "@/types/diary";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { PenSquare, Calendar, ChevronRight, BookHeart } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const { user, loginWithGoogle } = useAuth();
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
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-sm w-full bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Diary App</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Secure, sync-anywhere diary for your personal thoughts.
          </p>
          <button
            onClick={loginWithGoogle}
            className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95"
          >
            <svg className="w-5 h-5 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
              <path fill="none" d="M1 1h22v22H1z" />
            </svg>
            Continue with Google
          </button>
        </div>
      </main>
    );
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto w-full p-4 relative">
        <div className="flex items-center justify-between mb-8 mt-4">
          <h1 className="text-2xl font-bold">Your Diaries</h1>
          <Link
            href="/edit/new"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition duration-200 shadow-md font-medium text-sm"
          >
            <PenSquare className="w-4 h-4" />
            New Entry
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="animate-pulse flex space-x-4">
              <div className="rounded-full bg-gray-200 h-10 w-10"></div>
              <div className="flex-1 space-y-6 py-1">
                <div className="h-2 bg-gray-200 rounded"></div>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="h-2 bg-gray-200 rounded col-span-2"></div>
                    <div className="h-2 bg-gray-200 rounded col-span-1"></div>
                  </div>
                  <div className="h-2 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        ) : diaries.length === 0 ? (
          <div className="text-center p-12 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
            <BookHeart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No entries yet</h3>
            <p className="text-gray-500 mt-2">Start writing your thoughts today.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {diaries.map((diary) => {
              const dateObj = new Date(diary.date);
              return (
                <Link
                  key={diary.id}
                  href={`/edit/${diary.id}`}
                  className="group block p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2">
                        <Calendar className="w-3.5 h-3.5" />
                        {dateObj.toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          weekday: "short",
                        })}
                      </div>
                      <p className="text-gray-800 dark:text-gray-200 line-clamp-3 leading-relaxed">
                        {diary.content}
                      </p>
                    </div>
                    <div className="pt-1">
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
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
