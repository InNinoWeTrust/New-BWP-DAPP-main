import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThirdwebProvider, ChainId } from "@thirdweb-dev/react";  // Correct import for ThirdwebProvider

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Brown Waters Productions LLC",
  description: "Brown Waters DAO",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Wrap the app with ThirdwebProvider and specify the chain (e.g., Polygon) */}
        <ThirdwebProvider desiredChainId={ChainId.Polygon}>
          {children}
        </ThirdwebProvider>
      </body>
    </html>
  );
}
