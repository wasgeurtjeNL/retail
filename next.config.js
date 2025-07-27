/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable ESLint during builds for deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Completely disable TypeScript checking during build
  typescript: {
    ignoreBuildErrors: true,
  },
  // Skip type checking entirely during build
  experimental: {
    typedRoutes: false,
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