import { ReactNode, useEffect } from "react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import "@/styles/globals.css";
import { AppWrapper } from "@/context";

export const metadata = {
  title: "Jale",
  description:
    "Buy and Sell fairly used and new Books and other educational materials, Unilag",
};

interface RootLayoutProps {
  children: ReactNode;
}

const RootLayout = ({ children }: RootLayoutProps) => (
  <html lang="en">
    
    <body>
      <div className="main">
        <div className="gradient" />
      </div>
      <main className="app relative">
        <AppWrapper>
          <Navbar />
          {children}
          <Footer/>
        </AppWrapper>
      </main>
    </body>
  </html>
);

export default RootLayout;