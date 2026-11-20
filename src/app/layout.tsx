import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin", "cyrillic"], variable: "--font-manrope" });

export const metadata: Metadata = {
  title: "NFC POINT",
  description: "Цифровые страницы для заведений по NFC-карте",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={manrope.variable}>
      <body>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
