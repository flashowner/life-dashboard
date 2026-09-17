import type { Metadata } from "next";
import "./globals.css";

const siteBasePath = process.env.GITHUB_ACTIONS === "true" ? "/life-dashboard" : "";

export const metadata: Metadata = {
  title: "Life Dashboard",
  description: "A personal RPG-inspired dashboard for tracking life progress.",
  icons: { icon: `${siteBasePath}/favicon.svg` },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
