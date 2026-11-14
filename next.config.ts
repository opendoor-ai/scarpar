import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
  // 미니샵 주소 변경: 예전 주소(/s/아이디/...)로 들어와도 새 주소(/minishop/아이디/...)로 영구 이동
  async redirects() {
    return [{ source: "/s/:path*", destination: "/minishop/:path*", permanent: true }];
  },
  // 사진 올리기 (서버 액션) — 기본 1MB는 너무 작아요. 사진은 브라우저에서 줄여서 보내고,
  // Vercel이 받는 최대 크기(4.5MB) 아래로 맞춰요.
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
