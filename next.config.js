/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable ESLint during builds for deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Disable TypeScript build errors for deployment  
  typescript: {
    ignoreBuildErrors: true,
  },
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