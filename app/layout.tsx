import type { Metadata } from "next";
import ThemeRegistry from "@/src/app/registry";
import SessionWrapper from "@/components/SessionProvider";
import { Providers } from "./providers";
import {
  InstallPrompt,
  NotificationPermission,
  OfflineIndicator,
} from "@/components/ClientOnlyComponents";
export const metadata: Metadata = {
  title: "会員制掲示板",
  description: "会員限定の掲示板システム",
  manifest: "/manifest.json",
  themeColor: "#000000",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
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
        <Providers>
          <OfflineIndicator />
          {children}
          <InstallPrompt />
          <NotificationPermission />
        </Providers>
      </body>
    </html>
  );
}