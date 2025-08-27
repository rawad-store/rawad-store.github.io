import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// مهم: غيّر base ليكون نفس اسم الريبو بتاعك
export default defineConfig({
  plugins: [react()],
  base: "/",
});
