import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { AuthSessionProvider } from "@/providers/session-provider";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || "https://meet.markplusinc.com"),
  title: "MEET - MarkPlus Meeting Room Booking",
  description: "Elevate your meeting experience. Smart room booking, seamless scheduling, and real-time availability — all in one elegant platform by MarkPlus.",
  openGraph: {
    title: "MEET by MarkPlus",
    description: "Elevate your meeting experience. Smart room booking, seamless scheduling, and real-time availability — all in one elegant platform.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "MEET by MarkPlus - Meeting Room Booking System",
      },
    ],
    type: "website",
    siteName: "MEET by MarkPlus",
  },
  twitter: {
    card: "summary_large_image",
    title: "MEET by MarkPlus",
    description: "Elevate your meeting experience. Smart room booking, seamless scheduling, and real-time availability.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <AuthSessionProvider>
            <QueryProvider>
              {children}
              <Toaster
                position="top-center"
                toastOptions={{
                  style: {
                    borderRadius: "16px",
                    border: "1px solid rgba(0,0,0,0.06)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
                  },
                }}
              />
            </QueryProvider>
          </AuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
