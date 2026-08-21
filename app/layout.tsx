import type { Metadata } from "next";
import { Noto_Sans_JP, Zen_Old_Mincho, Roboto_Mono } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "./globals.css";

const notoSansJp = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-body-loaded",
  display: "swap",
});

const zenOldMincho = Zen_Old_Mincho({
  subsets: ["latin"],
  weight: ["500", "700", "900"],
  variable: "--font-disp-loaded",
  display: "swap",
});

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono-loaded",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.nishinippon-adv.jp"),
  title: {
    default: "アドプレス | ADPRESS",
    template: "%s | アドプレス",
  },
  description:
    "アドプレスは、編集部が確認したプレスリリースやニュースを掲載するメディアです。",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body
        className={`${notoSansJp.variable} ${zenOldMincho.variable} ${robotoMono.variable}`}
      >
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
