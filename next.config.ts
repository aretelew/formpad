import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['mathlive', '@cortex-js/compute-engine'],
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
