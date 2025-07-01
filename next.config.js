/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Fallback mechanisme voor niet gevonden modules tijdens HMR updates
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.moduleIds = 'deterministic';
    }
    return config;
  },
};

export default nextConfig; 