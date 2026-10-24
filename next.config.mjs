/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    '192.168.0.49',
    '192.168.0.49:3000',
    'AZUS-PC',
    'AZUS-PC:3000',
    'localhost',
    'localhost:3000',
    '127.0.0.1',
    '127.0.0.1:3000',
  ],
};

export default nextConfig;
