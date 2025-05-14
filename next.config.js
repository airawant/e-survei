/** @type {import('next').NextConfig} */
const nextConfig = {
  // Konfigurasi lain yang mungkin ada
  reactStrictMode: true,

  // Tambahkan konfigurasi header untuk CORS
  async headers() {
    return [
      {
        // Matching API routes
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" },
        ]
      }
    ]
  }
}

module.exports = nextConfig
