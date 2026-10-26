import type { Viewport } from "next";
import Script from "next/script";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { TickerPrecio } from "@/components/TickerPrecio";
import { HubFlotante } from "@/components/HubFlotante";
import { RegistrarPWA } from "@/components/RegistrarPWA";
import { VideoFondo } from "@/components/VideoFondo";
import { CONFIG } from "@/lib/config";
import "./globals.css";

const SITE_URL = "https://redcafeecuador.com";

export const viewport: Viewport = {
  themeColor: "#3B1A0C",
};

export const metadata = {
 metadataBase: new URL(SITE_URL),
 title: {
 default: "Red Café Ecuador | Todo el café ecuatoriano, conectado",
 template: "%s · Red Café Ecuador",
 },
 description:
 "Plataforma abierta y digital para negocios, actores y servicios del café ecuatoriano: marketplace, academia, precios, trazabilidad y asesoría.",
 keywords: [
 "café ecuatoriano",
 "marketplace café Ecuador",
 "café de especialidad",
 "productores de café Ecuador",
 "compra y venta de café",
 "academia cafetera",
 "trazabilidad café",
 "precio del café Ecuador",
 ],
  alternates: { canonical: SITE_URL },
  openGraph: {
    images: [
      {
        url: `${SITE_URL}/img/og-redcafe.jpg`,
        width: 1200,
        height: 630,
        alt: "Cerezas de café maduras · Red Café Ecuador",
      },
    ],
    type: "website",
    locale: "es_EC",
    url: SITE_URL,
    siteName: "Red Café Ecuador",
    title: "Red Café Ecuador | Todo el café ecuatoriano, conectado",
    description:
      "Una nueva forma de hacer negocios en la cadena de valor del café ecuatoriano: marketplace, academia, precios, trazabilidad y servicios para avanzar con más información.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Red Café Ecuador | Todo el café ecuatoriano, conectado",
    description:
      "Plataforma abierta para vender, comprar, aprender y encontrar servicios dentro del negocio cafetero ecuatoriano.",
    images: [`${SITE_URL}/img/og-redcafe.jpg`],
  },
 robots: {
 index: true,
 follow: true,
 },
 icons: {
 icon: [
 { url: `${CONFIG.basePath}/favicon.ico`, sizes: "any" },
 { url: `${CONFIG.basePath}/icon-192.png`, type: "image/png", sizes: "192x192" },
 ],
 apple: [{ url: `${CONFIG.basePath}/icon-192.png`, sizes: "192x192", type: "image/png" }],
 },
 manifest: `${CONFIG.basePath}/manifest.json`,
};

const jsonLd = {
 "@context": "https://schema.org",
 "@type": "Organization",
 name: "Red Café Ecuador",
 url: SITE_URL,
 description:
 "Plataforma abierta y digital para negocios, actores y servicios del café ecuatoriano.",
 sameAs: [],
 areaServed: "Ecuador",
};

export default function RootLayout({
 children,
}: Readonly<{ children: React.ReactNode }>) {
 return (
 <html lang="es">
 <head>
 <script
 type="application/ld+json"
 dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
 />
 </head>
 <body className="min-h-screen flex flex-col">
 <VideoFondo />
 <Navbar />
 <TickerPrecio />
 <main className="flex-1">{children}</main>
 <Footer />
 <HubFlotante />
 <RegistrarPWA />
 <Script src={`${CONFIG.basePath}/admin-visual-runtime.js`} strategy="afterInteractive" />
 </body>
 </html>
 );
}
