import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atlas GeoSales AI | Presupuesto comercial",
  description: "Inteligencia comercial geográfica con análisis presupuestal a nivel municipio.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
