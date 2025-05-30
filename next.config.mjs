/** @type {import('next').NextConfig} */
import fs from 'fs';

// Workaround: wrap realpathSync.native to fallback on EISDIR errors (e.g. on exFAT drives)
try {
  if (typeof fs.realpathSync.native === 'function') {
    const nativeRealpath = fs.realpathSync.native;
    fs.realpathSync.native = (path) => {
      try {
        return nativeRealpath(path);
      } catch (err) {
        if (err.code === 'EISDIR') {
          return fs.realpathSync(path);
        }
        throw err;
      }
    };
  }
} catch {}

// Workaround: wrap readlinkSync to fallback on EISDIR errors (e.g. on exFAT drives)
try {
  if (typeof fs.readlinkSync === 'function') {
    const origReadlinkSync = fs.readlinkSync;
    fs.readlinkSync = (path, options) => {
      try {
        return origReadlinkSync(path, options);
      } catch (err) {
        if (err.code === 'EISDIR') {
          return path;
        }
        throw err;
      }
    };
  }
} catch {}

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
