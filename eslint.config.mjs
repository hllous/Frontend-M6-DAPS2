import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  { ignores: ["public/mockServiceWorker.js", ".codex*/**", ".codex/**"] },
];

export default eslintConfig;
