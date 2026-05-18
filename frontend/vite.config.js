import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const devPort = env.VITE_DEV_PORT ? Number(env.VITE_DEV_PORT) : undefined;
  const apiProxyTarget = env.VITE_API_PROXY_TARGET;

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      dedupe: ["react", "react-dom"],
    },
    optimizeDeps: {
      include: ["react", "react-dom", "react-router-dom"],
    },
    server: {
      ...(devPort ? { port: devPort } : {}),
      ...(apiProxyTarget ? { proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      } } : {}),
    },
  };
});
