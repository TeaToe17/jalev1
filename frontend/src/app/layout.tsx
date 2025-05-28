import { ReactNode, useEffect } from "react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import "@/styles/globals.css";
import { AppWrapper } from "@/context";
import { Inter } from "next/font/google";
import type { Metadata } from "next"
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";


export const metadata: Metadata = {
  title: "Jale – Buy. Sell. Flex.",
  description:
    "Level up your hustle 💼💸. From books to gadgets to whatever's in your bag – Jale is the go-to campus marketplace. Join with a referral & unlock exclusive perks 🔥🚀.",
  openGraph: {
    title: "Join Our Amazing Platform - Special Invitation",
    description: "You've been personally invited! Join now and get exclusive benefits.",
    images: [
      {
        url: "https://jale.vercel.app/jalecover.png",
        width: 1200,
        height: 630,
        alt: "Join Our Platform - Special Invitation",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Join Our Amazing Platform - Special Invitation",
    description: "You've been personally invited! Join now and get exclusive benefits.",
    images: ["https://jale.vercel.app/jalecover.png"],
  },
}

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
