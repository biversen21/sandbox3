import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Increase limit to allow PDF and image uploads up to 10 MB.
      // TODO: Replace local file storage with S3-compatible storage before production.
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
