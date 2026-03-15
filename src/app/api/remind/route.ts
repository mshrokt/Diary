import { NextResponse } from "next/server";
import { getSubscriptions, getDiaries } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Check for authorization (Vercel Cron sends a specific header)
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // Lazy-load web-push to avoid build-time initialization errors
    const webpush = (await import("web-push")).default;
    console.log("DEBUG: Firebase Project ID:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
    
    const VAPID_PUBLIC_KEY = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "").trim();
    const VAPID_PRIVATE_KEY = (process.env.VAPID_PRIVATE_KEY || "").trim();
    
    console.log("DEBUG: Env presence check:", {
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: VAPID_PUBLIC_KEY ? "EXISTS" : "MISSING",
      NEXT_PUBLIC_VAPID_PUBLIC_KEY_LEN: VAPID_PUBLIC_KEY.length,
      VAPID_PRIVATE_KEY: VAPID_PRIVATE_KEY ? "EXISTS" : "MISSING",
      VAPID_PRIVATE_KEY_LEN: VAPID_PRIVATE_KEY.length,
      NODE_ENV: process.env.NODE_ENV
    });

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return NextResponse.json({ success: false, error: "VAPID keys not configured" }, { status: 500 });
    }
    
    webpush.setVapidDetails(
      "mailto:diary@example.com",
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );

    console.log("DEBUG: Fetching subscriptions...");
    let subscriptions: any[] = [];
    try {
      // 10秒でタイムアウトさせる
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Firestore query timeout")), 10000)
      );
      
      subscriptions = await Promise.race([
        getSubscriptions(),
        timeoutPromise
      ]) as any[];
      
      console.log(`DEBUG: Found ${subscriptions.length} subscriptions`);
    } catch (dbErr: any) {
      console.error("DEBUG ERROR: Failed to get subscriptions from Firestore:", dbErr.message || dbErr);
      return NextResponse.json({ success: false, error: dbErr.message || "DB Error" }, { status: 500 });
    }
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
    console.log("DEBUG: Today (JST):", todayStr);
    console.log(`DEBUG: Processing ${userMap.size} unique users`);

    for (const [userId, userSubs] of userMap.entries()) {
      const diaries = await getDiaries(userId);
      const hasEntryToday = diaries.some(d => {
        const dDate = new Date(d.date + (9 * 60 * 60 * 1000));
        return dDate.toISOString().split("T")[0] === todayStr;
      });

      if (!hasEntryToday) {
        for (const sub of userSubs) {
          try {
            console.log(`DEBUG: Attempting to send to user ${userId}...`);
            await webpush.sendNotification(
              sub,
              JSON.stringify({
                title: "My Diary",
                body: "今日のできごとを記録しませんか？",
                url: "/edit/new"
              })
            );
            console.log(`DEBUG: Successfully sent to ${userId}`);
            results.sent++;
          } catch (error) {
            console.error(`DEBUG ERROR: Failed to send to user ${userId}:`, error);
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
