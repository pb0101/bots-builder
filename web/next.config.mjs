/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",       // static site: S3 + CloudFront, no server
  trailingSlash: true,    // /pricing/ -> pricing/index.html on S3
  images: { unoptimized: true },
};
export default nextConfig;
