import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Touchline — Every match has a story",
  description:
    "Turn confirmed football events into multilingual commentary, player stories and broadcast graphics.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
