import api from "@/lib/api";
import serverApi from "@/lib/server-api";
import { type NextRequest, NextResponse } from "next/server";

const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

export interface PushSubscriptionDTO {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const { receiverId, userId, body, title } = await request.json();

    const response = await serverApi.post<PushSubscriptionDTO[]>(
      "user/get_sub_check_msg/",
      {
        "receiverId":receiverId,
        "userId":userId,
        "body":body,
      }
    );

    const subscriptions = response.data;

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json(
        { error: "No subscriptions found" },
        { status: 404 }
      );
    }

    if (!VAPID_PRIVATE_KEY || !VAPID_PUBLIC_KEY) {
      return NextResponse.json(
        { error: "VAPID keys not configured" },
        { status: 500 }
      );
    }

    const webpush = await import("web-push").catch(() => null);

    if (!webpush) {
      return NextResponse.json(
        {
          error: "web-push not installed",
          instruction: "Run: npm install web-push",
        },
        { status: 501 }
      );
    }

    webpush.default.setVapidDetails(
      "mailto:jale.official.contact@gmail.com",
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );

    const payload = JSON.stringify({
      title: title || "New Notification",
      body: body || "You have a new message",
      icon: "/icon-light-32x32.png",
    });

    // 🔥 Send to EACH subscription
    for (const sub of subscriptions) {
      if (!sub || !sub.endpoint) {
        console.warn("Skipping invalid subscription:", sub);
        continue;
      }

      try {
        console.log(sub);
        await webpush.default.sendNotification(sub, payload);
        console.log("[API] Notification sent to:", sub.endpoint);
      } catch (err) {
        console.error("[API] Failed for subscription:", sub.endpoint, err);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Notifications sent",
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to send notification";

    console.error("[API] Notification error:", errorMessage);

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
