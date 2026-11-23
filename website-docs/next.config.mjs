import nextra from "nextra";

/** @type {import('nextra').NextraConfig} */
const withNextra = nextra({
  theme: "nextra-theme-docs",
  themeConfig: "./theme.config.tsx",
  // Built-in full-text search powered by FlexSearch
  defaultShowCopyCode: true,
  // Syntax highlighting via Shiki — no extra setup needed
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // docs.dongle.app sits at the root, no basePath needed.
  // If you ever deploy to a sub-path, add: basePath: '/docs'

  // Forward /api/* to the main app so code examples can use relative paths
  async rewrites() {
    return [];
  },
};

export default withNextra(nextConfig);
