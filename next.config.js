/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fallback safety net only. The canonical redirect (www -> apex, HTTPS
  // enforced) should be configured at the Vercel domain level — see
  // README.md "Vercel Domain Configuration" for the required steps.
  //
  // These rules use next.config.js `redirects()` (evaluated at Vercel's
  // edge routing layer) rather than middleware, so no serverless/edge
  // function invocation is incurred per request.
  async redirects() {
    return [
      // https://www.wordiplyunlimited.com -> https://wordiplyunlimited.com
      // http://www.wordiplyunlimited.com  -> https://wordiplyunlimited.com
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.wordiplyunlimited.com" }],
        destination: "https://wordiplyunlimited.com/:path*",
        permanent: true,
      },
      // http://wordiplyunlimited.com -> https://wordiplyunlimited.com
      {
        source: "/:path*",
        has: [
          { type: "host", value: "wordiplyunlimited.com" },
          { type: "header", key: "x-forwarded-proto", value: "http" },
        ],
        destination: "https://wordiplyunlimited.com/:path*",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
