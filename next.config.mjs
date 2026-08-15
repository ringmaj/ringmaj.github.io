/** @type {import('next').NextConfig} */
const nextConfig = {
  agentRules: false,
  allowedDevOrigins: ["192.168.4.40"],
  env: {
    NEXT_PUBLIC_DEBUG: process.env.DEBUG ?? "false",
  },
};

export default nextConfig;
