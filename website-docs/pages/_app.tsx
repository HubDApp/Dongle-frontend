import type { AppProps } from "next/app";
import type { NextraThemeLayoutProps } from "nextra";

// Import Nextra's global styles
import "nextra-theme-docs/style.css";

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
