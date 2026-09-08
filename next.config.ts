import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  assetPrefix: process.env.GITHUB_ACTIONS ? '/GermanLearning/' : '',
  trailingSlash: false,
};

export default nextConfig;
