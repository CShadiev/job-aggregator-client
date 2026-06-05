import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

function getViteBase(homeUrl: string | undefined): string {
  const value = homeUrl?.trim() || "/";

  if (value === "/" || value === "") {
    return "/";
  }

  const withLeading = value.startsWith("/") ? value : `/${value}`;
  const pathname = withLeading.replace(/\/$/, "");

  return `${pathname}/`;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    base: getViteBase(env.VITE_HOME_URL),
  };
});
