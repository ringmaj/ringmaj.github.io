import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import NavBar from "./NavBar";
import RoutePreloader from "@/Components/RoutePreloader";
import PageNavigationController from "@/Components/PageNavigationController";
import { PositionInfoProvider } from "@/Components/PositionInfo";
import { KeyframingProvider } from "@/Components/Keyframing";
import { LightingDebugProvider } from "@/Components/LightingDebug";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Meet Henry Ring",
  description: "Software Engineer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PositionInfoProvider>
          <LightingDebugProvider>
            <KeyframingProvider>
              <PageNavigationController>
                <NavBar />
                <RoutePreloader />
                <main>{children}</main>
              </PageNavigationController>
            </KeyframingProvider>
          </LightingDebugProvider>
        </PositionInfoProvider>
      </body>
    </html>
  );
}
