import type React from "react";
import type { Metadata } from "next";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SupabaseSurveyProvider } from "@/context/SupabaseSurveyContext";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "E-Survei Kantor Kementerian Agama Kota Tanjungpinang",
  description: "Aplikasi Survei Kantor Kementerian Agama Kota Tanjungpinang",
  generator: "",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning={true}>
        <SupabaseSurveyProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            {children}
          </TooltipProvider>
        </SupabaseSurveyProvider>
      </body>
    </html>
  );
}

import "./globals.css";
