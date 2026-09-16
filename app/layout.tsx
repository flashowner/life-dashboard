import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Life Dashboard",
  description: "A personal RPG-inspired dashboard for tracking life progress.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
