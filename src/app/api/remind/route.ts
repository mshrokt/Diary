import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";
export const maxDuration = 30; // 最大30秒

export async function GET(request: Request) {
  // Check for authorization (Vercel Cron sends a specific header)
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // Lazy-load web-push to avoid build-time initialization errors
    const webpush = (await import("web-push")).default;
    
    const VAPID_PUBLIC_KEY = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "").trim();
    const VAPID_PRIVATE_KEY = (process.env.VAPID_PRIVATE_KEY || "").trim();
    
    console.log("DEBUG: VAPID keys check:", {
      publicLen: VAPID_PUBLIC_KEY.length,
      privateLen: VAPID_PRIVATE_KEY.length,
    });

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return NextResponse.json({ success: false, error: "VAPID keys not configured" }, { status: 500 });
    }
    
    webpush.setVapidDetails(
      "mailto:diary@example.com",
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );

    // Firebase Admin SDK でサブスクリプションを取得
    console.log("DEBUG: Fetching subscriptions via Admin SDK...");
    const subsSnapshot = await adminDb.collection("subscriptions").get();
    const subscriptions = subsSnapshot.docs.map(doc => doc.data());
    console.log(`DEBUG: Found ${subscriptions.length} subscriptions`);

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
      // Firebase Admin SDK でユーザーの日記を取得
      const diariesSnapshot = await adminDb
        .collection("diaries")
        .where("userId", "==", userId)
        .orderBy("date", "desc")
        .limit(10) // 最近10件だけチェック
        .get();
      
      const diaries = diariesSnapshot.docs.map(doc => doc.data());
      
      const hasEntryToday = diaries.some(d => {
        const dDate = new Date(d.date + (9 * 60 * 60 * 1000));
        return dDate.toISOString().split("T")[0] === todayStr;
      });

      console.log(`DEBUG: User ${userId} hasEntryToday=${hasEntryToday}, diaries=${diaries.length}`);

      if (!hasEntryToday) {
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
            console.log(`DEBUG: Successfully sent to ${userId}`);
            results.sent++;
          } catch (error: any) {
            console.error(`DEBUG ERROR: Failed to send to user ${userId}:`, error.message || error);
            if (error.statusCode) {
              console.error(`DEBUG STATUS: ${error.statusCode}`);
              console.error(`DEBUG BODY: ${error.body}`);
            }
            results.errors++;
          }
        }
      } else {
        results.skipped += userSubs.length;
      }
    }

    console.log("DEBUG: Final results:", results);
    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error("Reminder cron error:", error.message || error);
    return NextResponse.json({ success: false, error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
