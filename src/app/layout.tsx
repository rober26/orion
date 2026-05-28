import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orion",
  description: "Project management",
  icons: {
    icon: [
      { url: "/svg/2.svg", type: "image/svg+xml" },
      { url: "/png/2.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/png/2.png",
    apple: "/png/2.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full">
      <body>
        {children}
      </body>
    </html>
  );
}
