/** @type {import('next').NextConfig} */
const nextConfig = {
  agentRules: false,
  env: {
    NEXT_PUBLIC_DEBUG: process.env.DEBUG ?? "false",
  },
};

export default nextConfig;
