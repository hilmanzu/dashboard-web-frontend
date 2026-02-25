import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://pgn.coderchamps.my.id/api/:path*',
      },
      {
        source: '/storage/:path*',
        destination: 'http://pgn.coderchamps.my.id/storage/:path*',
      },
    ]
  },
};

export default nextConfig;
