import { NextResponse } from "next/server";
import webpush from "web-push";
import { getSubscriptions, getDiaries } from "@/lib/db";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";

webpush.setVapidDetails(
  "mailto:your-email@example.com",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export async function GET(request: Request) {
  // Check for authorization (Vercel Cron sends a specific header, or we can use a custom secret)
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const subscriptions: any[] = await getSubscriptions();
    const results = { sent: 0, skipped: 0, errors: 0 };

    // Group subscriptions by user to avoid redundant diary checks
    const userMap = new Map<string, any[]>();
    subscriptions.forEach(sub => {
      const subs = userMap.get(sub.userId) || [];
      subs.push(sub.subscription);
      userMap.set(sub.userId, subs);
    });

    // Current date in JST (UTC+9)
    const now = new Date();
    const jstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const todayStr = jstNow.toISOString().split("T")[0];

    for (const [userId, userSubs] of userMap.entries()) {
      const diaries = await getDiaries(userId);
      const hasEntryToday = diaries.some(d => {
        const dDate = new Date(d.date + (9 * 60 * 60 * 1000));
        return dDate.toISOString().split("T")[0] === todayStr;
      });

      if (!hasEntryToday) {
        // Send notification to all devices for this user
        for (const sub of userSubs) {
          try {
            await webpush.sendNotification(
              sub,
              JSON.stringify({
                title: "My Diary",
                body: "今日のできごとを記録しませんか？",
                url: "/edit/new"
              })
            );
            results.sent++;
          } catch (error) {
            console.error(`Failed to send to user ${userId}:`, error);
            results.errors++;
          }
        }
      } else {
        results.skipped += userSubs.length;
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Reminder cron error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
