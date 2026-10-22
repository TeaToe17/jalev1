import { ReactNode } from "react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import "@/styles/globals.css";
import { AppWrapper } from "@/context";
import { Inter } from "next/font/google";
import type { Metadata } from "next";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export const metadata: Metadata = {
  title: "Jale – Buy. Sell. Flex.",
  description:
    "Level up your hustle 💼💸. From books to gadgets to whatever's in your bag – Jale is the go-to campus marketplace. Join with a referral & unlock exclusive perks 🔥🚀.",
  openGraph: {
    title: "🎉NOW IN UNILAG!🔥 BUY. SELL. NEGOTIATE.🚀 ",
    description:
      "🎉 Now in UNILAG! Buy • Sell • Negotiate 📚💸 Got old TEXTBOOKS, PAST QUESTONS, or ANYTHING valuable, USED or NEW? Hurry! Turn them into CASH or even make REQUESTS for products you need — from EDUCATION to FASHION and everything in between! 🎒👗💬 NEGOTIATE when cash is tight. It’s your campus marketplace! 🔄🤝",
    images: [
      {
        url: "https://jale.vercel.app/jalecover.jpg",
        width: 1800,
        height: 700,
        alt: "Join Our Platform - Buy. Sell. Negotiate. Flex.",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Join Our Amazing Platform - Buy. Sell. Negotiate. Flex.",
    description:
      "🎉 Now in UNILAG! Buy • Sell • Negotiate 📚💸 Got old TEXTBOOKS, PAST QUESTONS, or ANYTHING valuable, USED or NEW? Hurry! Turn them into CASH or even make REQUESTS for products you need — from EDUCATION to FASHION and everything in between! 🎒👗💬 NEGOTIATE when cash is tight. It’s your campus marketplace! 🔄🤝",
    images: ["https://jale.vercel.app/jalecover.jpg"],
  },
  manifest: "/manifest.json",
  themeColor: "#000000",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Jale",
  },
  icons: {
    icon: "/jale logo.png",
    apple: "/jale logo.png",
  },
};

const inter = Inter({ subsets: ["latin"] });

interface RootLayoutProps {
  children: ReactNode;
}

const RootLayout = ({ children }: RootLayoutProps) => (
  <html lang="en">
    <head>
      <link
        href="https://fonts.googleapis.com/css2?family=Urbanist:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
    </head>
    <body className={`${inter.className} font-urbanist`}>
      <AppWrapper>
        <ToastContainer />
        <Navbar />
        {children}
        <Footer />
      </AppWrapper>
    </body>
  </html>
);

export default RootLayout;
