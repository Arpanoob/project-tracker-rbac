/** @type {import('next').NextConfig} */

// The API runs on a different host in production (e.g. Render). We proxy
// same-origin `/api/*` requests to it so the auth cookie stays first-party
// to this domain — otherwise the httpOnly cookie is set on the backend's
// domain and the middleware / login redirect can't see it.
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN ?? 'http://localhost:4000';

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_ORIGIN}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
