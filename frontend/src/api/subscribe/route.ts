import { type NextRequest, NextResponse } from "next/server"

// VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY should be set in environment variables
// Generate them with: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ""

export async function POST(request: NextRequest) {
  try {
    const subscription = await request.json()

    // Validate subscription object
    if (!subscription.endpoint) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 })
    }

    // Store subscription in localStorage is handled client-side
    // Here we just validate and confirm receipt
    console.log("[API] Subscription received:", {
      endpoint: subscription.endpoint.substring(0, 50) + "...",
      auth: subscription.keys?.auth ? "present" : "missing",
      p256dh: subscription.keys?.p256dh ? "present" : "missing",
    })

    return NextResponse.json({
      success: true,
      message: "Subscription received",
      vapidPublicKey: VAPID_PUBLIC_KEY,
    })
  } catch (error) {
    console.error("[API] Subscribe error:", error)
    return NextResponse.json({ error: "Failed to process subscription" }, { status: 500 })
  }
}
