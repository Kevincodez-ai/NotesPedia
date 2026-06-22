import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap", // Ensure text is visible while font loads
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// ── Viewport (must be exported separately in Next.js 15+) ───────
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#111827" },
  ],
  width: "device-width",
  initialScale: 1,
};

// ── SEO Metadata ─────────────────────────────────────────────────
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://notespedia.app"),
  title: {
    default: "NotesPedia — AI-Powered Academic Knowledge Platform",
    template: "%s | NotesPedia",
  },
  description:
    "Upload, organize, search, and share academic notes. Powered by AI for summaries, flashcards, and MCQs. The ultimate platform for college students.",
  keywords: [
    "notes", "academic notes", "AI", "college", "students", "study",
    "flashcards", "MCQs", "summaries", "NotesPedia",
  ],
  authors: [{ name: "NotesPedia" }],
  creator: "NotesPedia",
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
  },

  // Open Graph — rich previews on LinkedIn, Facebook, WhatsApp
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "NotesPedia",
    title: "NotesPedia — AI-Powered Academic Knowledge Platform",
    description:
      "Upload, organize, and share academic notes. AI-powered summaries, flashcards, and MCQs help you study smarter.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "NotesPedia — Academic Knowledge Platform",
      },
    ],
  },

  // Twitter / X card
  twitter: {
    card: "summary_large_image",
    title: "NotesPedia — AI-Powered Academic Knowledge Platform",
    description:
      "Upload, organize, and share academic notes. AI-powered summaries, flashcards, and MCQs help you study smarter.",
    images: ["/og-image.png"],
    creator: "@notespedia",
  },

  // Robots directive
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          {children}
          <Toaster position="bottom-right" richColors />
        </Providers>
      </body>
    </html>
  );
}
