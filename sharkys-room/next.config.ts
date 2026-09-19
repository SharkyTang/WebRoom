import type { NextConfig } from 'next';
import { networkInterfaces } from 'node:os';

const localNetworkOrigins = Object.values(networkInterfaces())
  .flatMap((addresses) => addresses ?? [])
  .filter((address) => address.family === 'IPv4' && !address.internal)
  .map((address) => address.address);

const config: NextConfig = {
  devIndicators: false,
  allowedDevOrigins: ['127.0.0.1', 'localhost', ...localNetworkOrigins],
  turbopack: { root: process.cwd() },
};
export default config;
