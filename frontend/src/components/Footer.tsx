import React from "react";
import Link from "next/link";

function Footer() {
  return (
    <div className="absolute  bottom-0 left-0 right-0">
      <footer
        className="relative bg-cover bg-center text-[#1c2b3a] px-4 py-8 mt-auto"
        style={{
          backgroundImage:
            "url('/stock-market-chart-abstract-financial-background-67569652.jpg')",
        }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-[#fcecd8]/80 backdrop-blur-sm"></div>

        <div className="relative max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 z-10 text-center md:text-left">
          <div className="text-sm">
            <p className="font-bold text-lg">Jàle</p>
            <p className="text-xs opacity-80">Market wey you fit price</p>
          </div>

          <div className="flex space-x-6 text-xs font-medium">
            <Link href="/about" className="hover:underline">
              About
            </Link>
            <Link href="/contact" className="hover:underline">
              Contact
            </Link>
            <Link href="/privacy" className="hover:underline">
              Privacy
            </Link>
          </div>

          <p className="text-xs opacity-60">
            &copy; {new Date().getFullYear()} Jale Inc.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default Footer;
