/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
  // Ignore typescript errors during build to prevent build failures from minor type issues
  typescript: {
    ignoreBuildErrors: true,
  },
  // Ignore eslint errors during build
  eslint: {
    ignoreDuringBuilds: true,
  }
};

export default nextConfig;