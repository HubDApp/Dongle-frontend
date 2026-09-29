/**
 * pa11y-ci configuration for WCAG AA compliance audits.
 *
 * Runs against a locally built Next.js production build (served statically)
 * and reports all WCAG 2.1 AA violations. Used by the `a11y:audit` script
 * and the `frontend_ci.yml` GitHub Actions workflow.
 *
 * Refs:
 *   - https://github.com/pa11y/pa11y-ci
 *   - https://github.com/pa11y/pa11y#configuration
 */
module.exports = {
  defaults: {
    standard: "WCAG2AA",
    level: "error",
    timeout: 60000,
    wait: 500,
    chromeLaunchConfig: {
      executablePath: process.env.PA11Y_CHROMIUM_PATH || undefined,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
      ],
    },
    runners: ["axe"],
    hideElements: [
      "[data-pa11y-ignore=\"true\"]",
      ".pa11y-ignore",
    ],
    ignore: [
      "WCAG2AA.Principle1.Guideline1_3.1_3_1.H49.AlignAttr",
      "color-contrast-enhanced",
    ],
    actions: [],
  },

  urls: [
    "http://localhost:3000/",
    "http://localhost:3000/discover",
    "http://localhost:3000/reviews",
    "http://localhost:3000/verify",
    "http://localhost:3000/projects/new",
    "http://localhost:3000/compare",
    "http://localhost:3000/listing",
    "http://localhost:3000/docs",
    "http://localhost:3000/privacy",
    "http://localhost:3000/terms",
    {
      url: "http://localhost:3000/profile",
      actions: [
        "wait for element [role=\"main\"] to be added",
      ],
    },
    {
      url: "http://localhost:3000/admin",
      actions: [
        "wait for element [role=\"main\"] to be added",
      ],
    },
    {
      url: "http://localhost:3000/projects/soroban-swap",
      actions: [
        "wait for element [role=\"main\"] to be added",
      ],
    },
    {
      url: "http://localhost:3000/projects/soroban-swap/updates",
      actions: [
        "wait for element [role=\"main\"] to be added",
      ],
    },
  ],

  numberOfWorkers: 2,

  log: {
    debug: process.env.PA11Y_DEBUG === "1",
    error: console.error.bind(console),
    info: console.info.bind(console),
  },
};
