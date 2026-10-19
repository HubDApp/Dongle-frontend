import React from "react";
import { DocsThemeConfig, useConfig } from "nextra-theme-docs";
import { useRouter } from "next/router";

const config: DocsThemeConfig = {
  // ── Brand ────────────────────────────────────────────────────────────────
  logo: (
    <span style={{ fontWeight: 700, fontSize: "1.15rem", letterSpacing: "-0.02em" }}>
      🔌 Dongle Docs
    </span>
  ),
  project: {
    link: "https://github.com/HubDApp/Dongle-frontend",
  },
  docsRepositoryBase:
    "https://github.com/HubDApp/Dongle-frontend/tree/main/website-docs",

  // ── Navigation ───────────────────────────────────────────────────────────
  navigation: {
    prev: true,
    next: true,
  },

  // ── Search ───────────────────────────────────────────────────────────────
  // Nextra 3 ships FlexSearch out of the box — no extra config needed.
  // To upgrade to Algolia DocSearch, uncomment below and add your keys.
  //
  // search: {
  //   component: AlgoliaSearch,
  // },

  // ── Sidebar ──────────────────────────────────────────────────────────────
  sidebar: {
    titleComponent({ title, type }) {
      if (type === "separator") {
        return <span style={{ fontWeight: 600, color: "var(--nextra-primary-hue)" }}>{title}</span>;
      }
      return <>{title}</>;
    },
    defaultMenuCollapseLevel: 1,
    toggleButton: true,
  },

  // ── TOC ──────────────────────────────────────────────────────────────────
  toc: {
    backToTop: true,
    extraContent: (
      <a
        href="https://dongle.app"
        target="_blank"
        rel="noreferrer"
        style={{ display: "block", marginTop: "1rem", fontSize: "0.8rem", opacity: 0.6 }}
      >
        ← Back to Dongle App ↗
      </a>
    ),
  },

  // ── Footer ───────────────────────────────────────────────────────────────
  footer: {
    content: (
      <span>
        © {new Date().getFullYear()}{" "}
        <a href="https://dongle.app" target="_blank" rel="noreferrer">
          Dongle
        </a>{" "}
        — Built on Stellar &amp; Soroban
      </span>
    ),
  },

  // ── Head / SEO ───────────────────────────────────────────────────────────
  useNextSeoProps() {
    const { asPath } = useRouter();
    return {
      titleTemplate: asPath === "/" ? "Dongle Docs" : "%s – Dongle Docs",
    };
  },

  head() {
    const { frontMatter } = useConfig();
    return (
      <>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content={frontMatter.description ?? "Dongle documentation — decentralized app store and review platform for the Stellar ecosystem."} />
        <meta property="og:title" content={frontMatter.title ? `${frontMatter.title} – Dongle Docs` : "Dongle Docs"} />
        <meta property="og:description" content={frontMatter.description ?? "API reference, smart contract specs, integration guides, and component library for Dongle."} />
        <link rel="icon" href="/favicon.ico" />
      </>
    );
  },

  // ── Colours ──────────────────────────────────────────────────────────────
  primaryHue: 210, // Stellar blue

  // ── Versions ─────────────────────────────────────────────────────────────
  // Using a manual selector in _meta.json is simpler than the banner for a
  // single active version. Enable banners here for pre-release / RC builds.
  banner: {
    key: "0.1-beta",
    content: (
      <a href="/changelog" target="_blank" rel="noreferrer">
        📋 Dongle 0.1.0 released — see the Changelog →
      </a>
    ),
    dismissible: true,
  },

  // ── Edit link ────────────────────────────────────────────────────────────
  editLink: {
    content: "Edit this page on GitHub →",
  },
  feedback: {
    content: "Report an issue →",
    labels: "documentation",
  },

  // ── Versioned docs ───────────────────────────────────────────────────────
  // Additional versions are exposed via the navbar component below.
  navbar: {
    extraContent: (
      <select
        aria-label="Documentation version"
        defaultValue="latest"
        onChange={(e) => {
          if (e.target.value !== "latest") {
            window.location.href = `/versions/${e.target.value}`;
          }
        }}
        style={{
          fontSize: "0.8rem",
          padding: "0.2rem 0.4rem",
          borderRadius: "0.3rem",
          border: "1px solid var(--nextra-gray-300)",
          background: "transparent",
          cursor: "pointer",
        }}
      >
        <option value="latest">v0.1 (latest)</option>
      </select>
    ),
  },
};

export default config;
