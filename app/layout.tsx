import "./globals.css";
import type { Metadata } from "next";
import AIAssistantButton from "@/components/AIAssistantButton";

export const metadata: Metadata = {
  title: "Cutz By Casper",
  description: "Premium barber booking for a single artist in New Jersey.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="gradient-bg min-h-screen">
        {children}
        <AIAssistantButton />
      </body>
    </html>
  );
}
