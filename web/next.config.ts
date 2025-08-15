import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  experimental: {
    nodeMiddleware: true,
    ppr: 'incremental'
  },
  images: {
    remotePatterns: [
      { 
        protocol: 'https',
        hostname: 'picsum.photos',
        pathname: '/**/**',
      },
      { 
        protocol: 'https',
        hostname: 'fastly.picsum.photos',
        pathname: '/**/**',
      }
    ]
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('aws4'); // 忽略 aws4
    } else {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        aws4: false, // 告诉 webpack 不需要打包 aws4
      };
    }
    return config;
  },
};

export default nextConfig;
