const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /[\\/]@runanywhere[\\/].*[\\/]wasm[\\/].*\.(js|wasm)$/,
      type: "asset/resource",
      generator: {
        emit: false,
        publicPath: "/wasm/",
        filename: "[name][ext]",
      },
    });
    config.module.rules.push({
      test: /[\\/]@runanywhere[\\/].*[\\/]dist[\\/].*\.js$/,
      use: [path.resolve(__dirname, "scripts/runanywhere-webpack-loader.js")],
    });
    return config;
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
