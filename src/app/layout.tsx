import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "./Providers";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";
import CookieConsentBanner from "@/components/CookieConsentBanner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://lasbarberstudio.com.br";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#050608",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "LAS Barber Studio | Lucas Augusto • Barbearia Privada & Alta Precisão",
  description: "Atendimento exclusivo e individual em estúdio privado com Lucas Augusto em Comodoro - MT. Cortes de alta precisão, barboterapia, alinhamento de barba e ambiente reservado para você.",
  keywords: [
    "LAS Barber Studio",
    "Lucas Augusto Barbeiro",
    "Barbearia Comodoro",
    "Barbearia em Comodoro MT",
    "Barbearia Privada",
    "Estúdio de Barba e Cabelo",
    "Corte Masculino de Alta Precisão",
    "Corte Masculino Premium",
    "Barboterapia Exclusiva",
    "Agendamento Barbearia",
  ],
  authors: [{ name: "Lucas Augusto • LAS Barber Studio" }],
  icons: {
    icon: [
      { url: "/brand/logo-square-512.png?v=las-gold-2026", sizes: "512x512", type: "image/png" },
      { url: "/icon-512.png?v=las-gold-2026", sizes: "512x512", type: "image/png" },
      { url: "/icon-192.png?v=las-gold-2026", sizes: "192x192", type: "image/png" },
      { url: "/icon.png?v=las-gold-2026", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico?v=las-gold-2026", sizes: "any" },
    ],
    apple: [
      { url: "/apple-icon.png?v=las-gold-2026", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico?v=las-gold-2026",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "LAS Barber Studio | Lucas Augusto • Barbearia Privada & Alta Precisão",
    description: "Atendimento exclusivo e individual em estúdio privado com Lucas Augusto em Comodoro - MT. Conforto térmico, lounge executivo, corte de precisão e barboterapia.",
    url: SITE_URL,
    siteName: "LAS Barber Studio",
    images: [
      {
        url: `${SITE_URL}/opengraph-image.png?v=las-gold-2026`,
        width: 1200,
        height: 630,
        alt: "LAS Barber Studio - Lucas Augusto",
      },
    ],
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LAS Barber Studio | Lucas Augusto",
    description: "Estúdio privado de barbearia e cortes de alta precisão com Lucas Augusto em Comodoro - MT.",
    images: [`${SITE_URL}/twitter-image.png?v=las-gold-2026`],
  },
  alternates: {
    canonical: SITE_URL,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "BarberShop",
  "name": "LAS Barber Studio - Lucas Augusto",
  "image": `${SITE_URL}/brand/logo-square-512.png`,
  "@id": SITE_URL,
  "url": SITE_URL,
  "telephone": "+55-69-99378-3204",
  "priceRange": "$$",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Rua dos Ipês, Nº 365E",
    "addressLocality": "Comodoro",
    "addressRegion": "MT",
    "postalCode": "78310-000",
    "addressCountry": "BR"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": -13.6631,
    "longitude": -59.7864
  },
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "opens": "08:00",
      "closes": "20:00"
    },
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": "Saturday",
      "opens": "08:00",
      "closes": "18:00"
    }
  ],
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "5.0",
    "bestRating": "5",
    "ratingCount": "48"
  },
  "hasMap": "https://share.google/chfF9rq5kwguwJSIE",
  "sameAs": [
    "https://www.instagram.com/lasbarberstudio_",
    "https://share.google/chfF9rq5kwguwJSIE",
    "https://www.google.com/search?kgmid=/g/11_0284hx4&q=Las+Barber+Studio"
  ]
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${playfair.variable} h-full antialiased dark`}
    >
      <head>
        <meta name="theme-color" content="#050608" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="LAS Studio" />
        <link rel="icon" type="image/png" sizes="512x512" href="/brand/logo-square-512.png?v=las-gold-2026" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png?v=las-gold-2026" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icon.png?v=las-gold-2026" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico?v=las-gold-2026" />
        <link rel="shortcut icon" href="/favicon.ico?v=las-gold-2026" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-icon.png?v=las-gold-2026" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#050608] text-white font-sans selection:bg-[#DFBA73] selection:text-black">
        <Providers>
          {children}
          <PwaInstallPrompt />
          <CookieConsentBanner />
        </Providers>
      </body>
    </html>
  );
}
