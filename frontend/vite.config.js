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
      ...(apiProxyTarget ? {
        proxy: {
          "/api": {
            target: apiProxyTarget,
            changeOrigin: true,
          },
        },
      } : {}),
    },
    build: {
      outDir: "dist",
      sourcemap: false,
      minify: "esbuild",
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              if (id.includes("react") || id.includes("react-dom") || id.includes("react-router")) {
                return "vendor-react";
              }
              if (id.includes("recharts")) {
                return "vendor-recharts";
              }
              return "vendor";
            }
          },
        },
      },
    },
  };
});
