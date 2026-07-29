import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Brandforge — Naming inteligente",
  description: "Generador determinista de nombres de marca y dominios."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
