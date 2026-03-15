import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const webpush = (await import("web-push")).default;
    
    const VAPID_PUBLIC_KEY = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "").trim();
    const VAPID_PRIVATE_KEY = (process.env.VAPID_PRIVATE_KEY || "").trim();
    
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      console.error("DEBUG: VAPID keys missing.");
      return NextResponse.json({ success: false, error: "VAPID keys not configured" }, { status: 500 });
    }
    
    webpush.setVapidDetails(
      "mailto:diary@example.com",
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );

    console.log("DEBUG: Fetching subscriptions...");
    const subsSnapshot = await adminDb.collection("subscriptions").get();
    const subscriptions = subsSnapshot.docs.map(doc => doc.data());
    console.log(`DEBUG: Found ${subscriptions.length} subscriptions total.`);

    if (subscriptions.length === 0) {
      return NextResponse.json({ success: true, results: { sent: 0, skipped: 0, errors: 0 } });
    }

    const userMap = new Map<string, any[]>();
    subscriptions.forEach(sub => {
      const subs = userMap.get(sub.userId) || [];
      subs.push(sub.subscription);
      userMap.set(sub.userId, subs);
    });

    const now = new Date();
    const jstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const todayStr = jstNow.toISOString().split("T")[0];

    const results = { sent: 0, skipped: 0, errors: 0 };
    console.log(`DEBUG: Processing ${userMap.size} unique users for date: ${todayStr}`);

    for (const [userId, userSubs] of userMap.entries()) {
      const diariesSnapshot = await adminDb
        .collection("diaries")
        .where("userId", "==", userId)
        .orderBy("date", "desc")
        .limit(1)
        .get();
      
      const hasEntryToday = diariesSnapshot.docs.some(doc => {
        const d = doc.data();
        const dDate = new Date(d.date + (9 * 60 * 60 * 1000));
        return dDate.toISOString().split("T")[0] === todayStr;
      });

      if (!hasEntryToday) {
        console.log(`DEBUG: User ${userId} has no entry for today. Sending notification...`);
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
            console.log(`DEBUG: Successfully sent to user ${userId}`);
          } catch (error: any) {
            console.error(`DEBUG ERROR: Failed to send to user ${userId}:`, error.message || error);
            results.errors++;
          }
        }
      } else {
        console.log(`DEBUG: User ${userId} already has an entry for today. Skipping.`);
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
