import type { Metadata, Viewport } from "next";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";
import { AppProvider } from "@/components/providers/AppProvider";
import { PhoneShell } from "@/components/layout/PhoneShell";

export const metadata: Metadata = {
  title: "RasoiSaathi — Voice-First Kitchen Companion",
  description:
    "Voice-first AI business partner for home-based tiffin services in India.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icons/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "RasoiSaathi",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#F97316",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <AppProvider>
          <PhoneShell>{children}</PhoneShell>
        </AppProvider>
      </body>
    </html>
  );
}
