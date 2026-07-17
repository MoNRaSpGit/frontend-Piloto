import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const isGithubPagesBuild = mode === "github-pages";

  return {
    base: isGithubPagesBuild ? "/frontend-Piloto/" : "/",
    plugins: [react()]
  };
});
