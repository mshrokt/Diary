"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

interface CalendarProps {
  diaryDates: Set<string>; // "YYYY-MM-DD" strings
  onDateClick: (dateStr: string) => void;
}

export default function Calendar({ diaryDates, onDateClick }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDay.getDay(); // 0=Sun
  const daysInMonth = lastDay.getDate();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Build calendar grid
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d);
  }

  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const monthName = `${year}年${month + 1}月`;

  // Count diary entries this month
  const entriesThisMonth = Array.from(diaryDates).filter((d) => {
    return d.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`);
  }).length;

  return (
    <div className="bg-card rounded-3xl border border-border shadow-sm p-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight">{monthName}</h2>
          {entriesThisMonth > 0 && (
            <p className="text-xs text-muted mt-0.5">{entriesThisMonth}日記録あり</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={goToToday}
            className="text-xs font-medium text-primary hover:bg-primary/10 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
          >
            今日
          </button>
          <button
            onClick={prevMonth}
            className="p-2 rounded-xl hover:bg-surface-hover transition-all active:scale-90 cursor-pointer"
            aria-label="前の月"
          >
            <ChevronLeft className="w-4 h-4 text-muted" />
          </button>
          <button
            onClick={nextMonth}
            className="p-2 rounded-xl hover:bg-surface-hover transition-all active:scale-90 cursor-pointer"
            aria-label="次の月"
          >
            <ChevronRight className="w-4 h-4 text-muted" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-2">
        {weekdays.map((w, i) => (
          <div
            key={w}
            className={`text-center text-[11px] font-semibold py-1 ${
              i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-muted"
            }`}
          >
            {w}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} />;
          }

          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const hasDiary = diaryDates.has(dateStr);
          const isToday = dateStr === todayStr;
          const dayOfWeek = (startDayOfWeek + day - 1) % 7;
          const isSunday = dayOfWeek === 0;
          const isSaturday = dayOfWeek === 6;

          return (
            <button
              key={dateStr}
              onClick={() => hasDiary && onDateClick(dateStr)}
              className={`
                relative flex flex-col items-center justify-center py-2 rounded-xl transition-all duration-200
                ${hasDiary ? "cursor-pointer hover:bg-primary/10 active:scale-90" : "cursor-default"}
                ${isToday ? "bg-primary/5 ring-1 ring-primary/30" : ""}
              `}
            >
              <span
                className={`text-sm leading-none ${
                  isToday
                    ? "font-bold text-primary"
                    : hasDiary
                    ? "font-semibold text-foreground"
                    : isSunday
                    ? "text-red-400/60"
                    : isSaturday
                    ? "text-blue-400/60"
                    : "text-muted/60"
                }`}
              >
                {day}
              </span>
              {/* Diary indicator dot */}
              {hasDiary && (
                <div className="mt-1 flex items-center gap-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-primary to-accent shadow-sm" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Streak info */}
      {diaryDates.size > 0 && (
        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-primary to-accent" />
            <span className="text-xs text-muted">日記を書いた日</span>
          </div>
          <span className="text-xs font-medium text-primary">
            合計 {diaryDates.size} 日
          </span>
        </div>
      )}
    </div>
  );
}
