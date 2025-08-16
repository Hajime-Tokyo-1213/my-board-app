import type { Metadata } from "next";
import ThemeProvider from "@/src/providers/ThemeProvider";
import SessionWrapper from "@/components/SessionProvider";

export const metadata: Metadata = {
  title: "会員制掲示板",
  description: "会員限定の掲示板システム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <SessionWrapper>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </SessionWrapper>
      </body>
    </html>
  );
}