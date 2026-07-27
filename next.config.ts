import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
  experimental: {
    // O backend aceita planilhas de até 25 MB. O limite do proxy precisa ser
    // ligeiramente maior para incluir os metadados do multipart/form-data.
    middlewareClientMaxBodySize: "30mb",
  },
  async rewrites() {
    if (process.env.NODE_ENV !== "development") {
      return [];
    }

    const localApiBaseUrl = (process.env.EVOQUE_API_PROXY_URL ?? "http://127.0.0.1:5207").replace(/\/$/, "");
    return [
      {
        source: "/api/:path*",
        destination: `${localApiBaseUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
