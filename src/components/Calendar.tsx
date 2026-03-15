"use client";

import { ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";
import { useState } from "react";

interface CalendarProps {
  diaryData: Map<string, { intensity: number; id: string; preview?: string; hasImage?: boolean }>; // "YYYY-MM-DD" -> { intensity, id, preview, hasImage }
  onDateClick: (dateStr: string) => void;
}

export default function Calendar({ diaryData, onDateClick }: CalendarProps) {
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
  const entriesThisMonth = Array.from(diaryData.keys()).filter((d) => {
    return d.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`);
  }).length;

  const getIntensityClass = (intensity: number) => {
    if (intensity === 0) return "";
    if (intensity < 100) return "bg-primary/20 text-primary font-semibold";
    if (intensity < 500) return "bg-primary/40 text-white font-bold";
    if (intensity < 1000) return "bg-primary/70 text-white font-bold";
    return "bg-primary text-white font-extrabold shadow-sm shadow-primary/30";
  };

  return (
    <div className="bg-card rounded-3xl border border-border shadow-sm p-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight">{monthName}</h2>
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
          const dayInfo = diaryData.get(dateStr);
          const hasDiary = !!dayInfo;
          const isToday = dateStr === todayStr;
          const dayOfWeek = (startDayOfWeek + day - 1) % 7;
          const isSunday = dayOfWeek === 0;
          const isSaturday = dayOfWeek === 6;

          return (
            <button
              key={dateStr}
              onClick={() => hasDiary && onDateClick(dateStr)}
              className={`
                relative flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-200 group
                ${hasDiary ? "cursor-pointer hover:opacity-80 active:scale-90" : "cursor-default hover:bg-surface-hover/50"}
                ${isToday && !hasDiary ? "ring-1 ring-primary/30 bg-primary/5" : ""}
                ${hasDiary ? getIntensityClass(dayInfo.intensity) : ""}
              `}
            >
              <span
                className={`text-sm leading-none ${
                    isToday && !hasDiary ? "font-bold text-primary" :
                    hasDiary ? "" :
                    isSunday ? "text-red-400/60" :
                    isSaturday ? "text-blue-400/60" :
                    "text-muted/60"
                }`}
              >
                {day}
              </span>
              {dayInfo?.hasImage && (
                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-accent/40 rounded-tl-[6px] pointer-events-none" />
              )}
              {isToday && hasDiary && (
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-accent border-2 border-card rounded-full shadow-sm" />
              )}
              
              {/* Tooltip on hover */}
              {hasDiary && dayInfo.preview && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-card/90 backdrop-blur-md border border-border rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                  <p className="text-[10px] text-foreground leading-relaxed line-clamp-4 whitespace-pre-wrap text-left">
                    {dayInfo.preview}
                  </p>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-card/90" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend & Stats */}
      <div className="mt-5 pt-3 border-t border-border space-y-3">
        <div className="flex items-center justify-between text-[10px] text-muted">
          <div className="flex items-center gap-1.5">
            <span>少ない</span>
            <div className="w-2.5 h-2.5 rounded-[3px] bg-primary/20" />
            <div className="w-2.5 h-2.5 rounded-[3px] bg-primary/40" />
            <div className="w-2.5 h-2.5 rounded-[3px] bg-primary/70" />
            <div className="w-2.5 h-2.5 rounded-[3px] bg-primary" />
            <span>多い</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-primary">
                記録した日: {entriesThisMonth}日
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
