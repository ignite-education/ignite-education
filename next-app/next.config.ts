import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'auth.ignite.education',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'yjvdakdghkfnlhdpbocg.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // NOTE: `/` -> `/welcome` is NOT redirected here. It was declared in three
  // places (this config, src/app/page.tsx, and the apex vercel.json) and the
  // config redirect fired first, making page.tsx dead code. The apex
  // vercel.json is the authority for visitors; src/app/page.tsx covers direct
  // hits on this origin.
};

export default nextConfig;
