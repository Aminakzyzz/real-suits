import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Touchline — AI Match Studio",
  description:
    "Watch football through a new lens. Computer vision, multilingual commentary and a match studio built for the game.",
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
