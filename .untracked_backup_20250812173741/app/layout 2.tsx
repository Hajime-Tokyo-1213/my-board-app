import type { Metadata } from "next";
import ThemeProvider from "@/providers/ThemeProvider";

export const metadata: Metadata = {
  title: "オープン掲示板",
  description: "誰でも自由に投稿・編集・削除ができる掲示板",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}