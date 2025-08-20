import type { Metadata } from "next";
import ThemeRegistry from "@/src/app/registry";
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
      <head>
        <meta name="emotion-insertion-point" content="" />
      </head>
      <body>
        <SessionWrapper>
          <ThemeRegistry>
            {children}
          </ThemeRegistry>
        </SessionWrapper>
      </body>
    </html>
  );
}