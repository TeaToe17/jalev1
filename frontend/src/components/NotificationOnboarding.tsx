"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BellRing,
  X,
  Share,
  PlusSquare,
  MessageCircle,
  ChevronRight,
  Smartphone,
  Settings,
  CheckCircle2,
  ArrowUpFromLine,
} from "lucide-react";

interface Props {
  enabled: boolean;
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  subscribe: () => Promise<boolean>;
}

type Stage = "ios-install" | "enable" | "denied";

type Browser = "safari" | "chrome" | "other";

const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000;

const NotificationOnboarding = ({
  enabled,
  isSupported,
  isSubscribed,
  isLoading,
  subscribe,
}: Props) => {
  const [stage, setStage] = useState<Stage | null>(null);
  const [browser, setBrowser] = useState<Browser>("other");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  const evaluated = useRef(false);

  const dismiss = useCallback(() => {
    if (stage) {
      localStorage.setItem(
        `jale-notification-dismissed-${stage}`,
        String(Date.now() + DISMISS_DURATION),
      );
    }

    setOpen(false);
  }, [stage]);

  useEffect(() => {
    if (!enabled || isSubscribed || isLoading || evaluated.current) {
      return;
    }

    const ua = navigator.userAgent;

    const isIOS =
      /iPhone|iPad|iPod/i.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    const isAndroid = /Android/i.test(ua);

    if (!isIOS && !isAndroid) return;

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;

    const isChrome = /CriOS/i.test(ua);
    const isSafari =
      /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);

    let detectedBrowser: Browser = "other";

    if (isChrome) detectedBrowser = "chrome";
    else if (isSafari) detectedBrowser = "safari";

    setBrowser(detectedBrowser);

    let nextStage: Stage;

    if (isIOS && !isStandalone) {
      nextStage = "ios-install";
    } else {
      if (!isSupported) return;

      nextStage = Notification.permission === "denied" ? "denied" : "enable";
    }

    const dismissedUntil = Number(
      localStorage.getItem(`jale-notification-dismissed-${nextStage}`) || 0,
    );

    if (dismissedUntil > Date.now()) {
      evaluated.current = true;
      return;
    }

    evaluated.current = true;

    const timer = window.setTimeout(() => {
      setStage(nextStage);
      setOpen(true);
    }, 3500);

    return () => window.clearTimeout(timer);
  }, [enabled, isSupported, isSubscribed, isLoading]);

  const handleSubscribe = async () => {
    setError("");

    const success = await subscribe();

    if (success) {
      setOpen(false);
      return;
    }

    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "denied"
    ) {
      setStage("denied");
    } else {
      setError("We couldn't enable notifications. Please try again.");
    }
  };

  return (
    <AnimatePresence>
      {open && stage && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismiss}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="notification-title"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 70, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.97 }}
            transition={{ type: "spring", damping: 25, stiffness: 260 }}
            className="relative w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-t-[28px] sm:rounded-[28px] bg-white text-slate-900 shadow-2xl"
          >
            {/* Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#1c2b3a] to-[#344b5f] px-6 pt-7 pb-8 text-white">
              <button
                onClick={dismiss}
                aria-label="Close"
                className="absolute right-5 top-5 rounded-full bg-white/10 p-2 hover:bg-white/20 transition"
              >
                <X size={19} />
              </button>

              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-lime-300 text-slate-900 shadow-lg">
                <BellRing size={27} />
              </div>

              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-lime-300">
                Stay connected with JAle
              </p>

              <h2
                id="notification-title"
                className="text-2xl font-bold leading-tight"
              >
                {stage === "ios-install"
                  ? "Take JAle wherever you go."
                  : stage === "denied"
                    ? "Let's turn notifications back on."
                    : "Don't miss your next deal."}
              </h2>

              <p className="mt-3 text-sm leading-relaxed text-white/75">
                {stage === "ios-install"
                  ? "Add JAle to your Home Screen so you can receive important messages and updates."
                  : stage === "denied"
                    ? "Notifications are currently blocked. You can change this in your device settings."
                    : "Get notified when buyers message you, sellers respond, or someone is interested in your products."}
              </p>
            </div>

            <div className="space-y-5 px-6 py-6">
              {/* iOS installation instructions */}
              {stage === "ios-install" && (
                <>
                  <div className="rounded-2xl bg-lime-50 p-4">
                    <div className="flex items-center gap-3">
                      <MessageCircle className="text-lime-700" size={23} />
                      <div>
                        <p className="font-semibold text-sm">
                          A message could be waiting for you.
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          Stay reachable even when you're away.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="font-bold">
                        Add JAle to your Home Screen
                      </h3>
                      <span className="text-xs text-slate-500">
                        3 easy steps
                      </span>
                    </div>

                    <div className="space-y-5">
                      {browser === "safari" ? (
                        <>
                          <Step
                            number="1"
                            title="Tap the Share button"
                            description="Look for the square icon with an upward arrow in Safari's toolbar."
                            icon={<Share size={21} />}
                          />
                          <Step
                            number="2"
                            title="Find Add to Home Screen"
                            description="Scroll through the Share menu until you find Add to Home Screen."
                            icon={<ArrowUpFromLine size={21} />}
                          />
                          <Step
                            number="3"
                            title="Tap Add"
                            description="Confirm by tapping Add in the top-right corner."
                            icon={<PlusSquare size={21} />}
                          />
                        </>
                      ) : browser === "chrome" ? (
                        <>
                          <Step
                            number="1"
                            title="Tap the Share icon"
                            description="Look for the Share icon near the top of Chrome's address bar."
                            icon={<Share size={21} />}
                          />
                          <Step
                            number="2"
                            title="Select Add to Home Screen"
                            description="Find this option in the sharing menu."
                            icon={<ArrowUpFromLine size={21} />}
                          />
                          <Step
                            number="3"
                            title="Tap Add"
                            description="Confirm to place JAle on your Home Screen."
                            icon={<PlusSquare size={21} />}
                          />
                        </>
                      ) : (
                        <>
                          <Step
                            number="1"
                            title="Open the Share menu"
                            description="Look for your browser's Share option."
                            icon={<Share size={21} />}
                          />
                          <Step
                            number="2"
                            title="Choose Add to Home Screen"
                            description="Find the option in the sharing menu."
                            icon={<Smartphone size={21} />}
                          />
                          <Step
                            number="3"
                            title="Confirm by tapping Add"
                            description="JAle will now appear on your Home Screen."
                            icon={<PlusSquare size={21} />}
                          />
                        </>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold">One last thing!</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      After adding JAle, close your browser and open JAle using
                      the new icon on your Home Screen. Then enable
                      notifications inside JAle.
                    </p>
                  </div>
                </>
              )}

              {/* Enable notifications */}
              {stage === "enable" && (
                <>
                  <div className="space-y-3">
                    <Benefit
                      icon={<MessageCircle size={19} />}
                      title="Never miss a message"
                      description="Know when someone responds to your negotiation."
                    />
                    <Benefit
                      icon={<BellRing size={19} />}
                      title="Stay ahead of buyers"
                      description="Get notified when someone is interested in your products."
                    />
                    <Benefit
                      icon={<CheckCircle2 size={19} />}
                      title="Respond in time"
                      description="Keep conversations and transactions moving."
                    />
                  </div>

                  {error && (
                    <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                      {error}
                    </p>
                  )}

                  <button
                    onClick={handleSubscribe}
                    disabled={isLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1c2b3a] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#30475c] disabled:opacity-60"
                  >
                    {isLoading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        Enabling notifications...
                      </>
                    ) : (
                      <>
                        <BellRing size={18} />
                        Enable Notifications
                        <ChevronRight size={17} />
                      </>
                    )}
                  </button>
                </>
              )}

              {/* Permission denied */}
              {stage === "denied" && (
                <div className="space-y-4">
                  <div className="flex gap-3 rounded-xl bg-amber-50 p-4">
                    <Settings className="shrink-0 text-amber-700" size={22} />
                    <p className="text-sm leading-relaxed text-slate-700">
                      Open your device settings, find JAle or your browser under
                      Notifications, and allow notifications.
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={dismiss}
                className="w-full py-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
              >
                Maybe later
              </button>

              <p className="text-center text-[11px] text-slate-400">
                Your marketplace. Your conversations. Stay connected.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const Step = ({
  number,
  title,
  description,
  icon,
}: {
  number: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) => (
  <div className="flex items-start gap-3">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1c2b3a] text-sm font-bold text-white">
      {number}
    </div>

    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">
        {description}
      </p>
    </div>

    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
      {icon}
    </div>
  </div>
);

const Benefit = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => (
  <div className="flex items-center gap-3">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime-100 text-lime-800">
      {icon}
    </div>

    <div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-0.5 text-xs text-slate-500">{description}</p>
    </div>
  </div>
);

export default NotificationOnboarding;
