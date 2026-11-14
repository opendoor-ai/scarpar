import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { Toaster } from "sonner";
import "./globals.css";

import { env } from "@/lib/env";
import { mediaUrl } from "@/lib/media-url";
import {
  GOOGLE_SITE_VERIFICATION,
  NAVER_SITE_VERIFICATION,
  SITE_NAME,
} from "@/lib/site";
import { getSiteConfig } from "@/modules/site-config/get";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

// 사이트 전체 기본 검색 정보 — 관리자 → 사이트 설정 → 검색엔진 최적화(SEO)에서 바꿔요
export async function generateMetadata(): Promise<Metadata> {
  const { seo, app } = await getSiteConfig();
  const google = seo.googleVerification || GOOGLE_SITE_VERIFICATION;
  const naver = seo.naverVerification || NAVER_SITE_VERIFICATION;
  const other: Record<string, string> = {};
  if (naver) other["naver-site-verification"] = naver;
  if (seo.bingVerification) other["msvalidate.01"] = seo.bingVerification;
  const ogImage = seo.ogImage ? mediaUrl(seo.ogImage) : undefined;
  const favicon = seo.favicon ? mediaUrl(seo.favicon) : undefined;

  return {
    // 공유·검색용 절대주소 기준 (예: https://www.jadong.co.kr)
    metadataBase: new URL(env.APP_URL),
    title: seo.title || SITE_NAME,
    description: seo.description,
    keywords: seo.keywords
      ? seo.keywords.split(",").map((k) => k.trim()).filter(Boolean)
      : undefined,
    applicationName: SITE_NAME,
    openGraph: {
      siteName: SITE_NAME,
      locale: "ko_KR",
      type: "website",
      title: seo.title || SITE_NAME,
      description: seo.description,
      ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 630 }] } : {}),
    },
    twitter: { card: ogImage ? "summary_large_image" : "summary" },
    ...(favicon ? { icons: { icon: favicon, apple: favicon } } : {}),
    ...(app.enabled ? { manifest: "/manifest.webmanifest" } : {}),
    appleWebApp: app.enabled ? { capable: true, title: app.shortName, statusBarStyle: "default" } : undefined,
    formatDetection: { telephone: true },
    // 네이버 서치어드바이저 / 구글 서치콘솔 / 빙 "사이트 소유 확인"
    verification: {
      ...(google ? { google } : {}),
      ...(Object.keys(other).length ? { other } : {}),
    },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const { app } = await getSiteConfig();
  return { themeColor: app.themeColor };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { seo, display } = await getSiteConfig();
  // 관리자 → 상품정보표시 설정: 상품 카드에서 숨길 항목 (모든 목록에 한 번에 적용)
  const hiddenCardFields = Object.entries(display.card)
    .filter(([key, v]) => !v.show && /^[a-z]+$/.test(key))
    .map(([key]) => `[data-card-field="${key}"]`);
  const ga4 = /^G-[A-Z0-9]{4,20}$/i.test(seo.ga4Id) ? seo.ga4Id : "";
  const naverWa = /^[a-z0-9]{4,40}$/i.test(seo.naverAnalyticsId) ? seo.naverAnalyticsId : "";
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased`}
      >
        {hiddenCardFields.length ? <style>{`${hiddenCardFields.join(",")}{display:none!important}`}</style> : null}
        {children}
        <Toaster richColors position="top-right" />
        {/* 방문 분석 (관리자 → SEO에서 ID를 넣었을 때만) */}
        {ga4 ? (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga4}`} strategy="afterInteractive" />
            <Script id="ga4" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga4}');`}
            </Script>
          </>
        ) : null}
        {naverWa ? (
          <Script id="naver-wcs" strategy="afterInteractive">
            {`(function(){if(!window.wcs_add)window.wcs_add={};window.wcs_add["wa"]="${naverWa}";var s=document.createElement("script");s.src="https://wcs.pstatic.net/wcslog.js";s.async=true;s.onload=function(){if(window.wcs&&window.wcs_do)window.wcs_do();};document.head.appendChild(s);})();`}
          </Script>
        ) : null}
      </body>
    </html>
  );
}
