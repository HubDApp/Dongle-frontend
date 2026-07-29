# Dependency Update & Audit Policy

This document outlines the policy, cadence, and procedures for audit checks, package updates, and compatibility verifications for the Dongle project.

---

## 1. Security Auditing

We enforce dependency security checks both locally and in continuous integration (CI) to prevent vulnerable packages from being introduced to production.

### Local Audit Command
To check dependencies for vulnerabilities:
```bash
npm run audit
```
This runs a custom wrapper script (`scripts/audit-check.js`) that performs `npm audit` and validates vulnerabilities against our list of active, documented exceptions.

### Continuous Integration (CI)
The CI suite runs `npm run audit` as part of the quality gate. If a new, unexcused vulnerability of level `moderate` or higher is found, the build will fail.

---

## 2. Dependency Update Cadence

To maintain a healthy, secure codebase while avoiding breaking changes in fast-moving frontend and blockchain packages:

| Cadence | Actions | Responsibilities |
| :--- | :--- | :--- |
| **Weekly** | Run `npm run audit` to check for new advisories. | Developer |
| **Monthly** | Run `npm outdated` to check for minor/patch updates. Update non-breaking dependencies. | Maintainer |
| **Quarterly** | Major version upgrades (e.g., Next.js, React, Tailwind) & SDK alignments. | Lead Engineer |

---

## 3. Blockchain & Wallet SDK Compatibility Checks

The project integrates with the Stellar blockchain ecosystem (`stellar-sdk`, `@stellar/freighter-api`). Because blockchain protocols and wallet APIs evolve rapidly, all updates to these specific packages must undergo a strict verification process:

1. **Freighter API (`@stellar/freighter-api`)**:
   - Must be verified for compatibility with mainstream browser extensions.
   - Perform user-acceptance testing (UAT) on connecting/signing flows on testnet before releasing to mainnet.
2. **Stellar SDK (`stellar-sdk`)**:
   - Ensure the SDK version is compatible with the target Stellar RPC endpoints (`NEXT_PUBLIC_SOROBAN_RPC_URL`) and the network passphrase.
   - Run the contract interaction integration test suite to verify RPC client compatibility.

---

## 4. Documented Exceptions

The following exceptions are currently allowed in our audit flow. They are defined programmatically in `scripts/audit-check.js`.

### `@babel/core`
* **Severity**: Moderate
* **Advisory**: [GHSA-4x5r-pxfx-6jf8](https://github.com/advisories/GHSA-4x5r-pxfx-6jf8)
* **Rationale**: This is a build/devDependency. The arbitrary file read vulnerability via sourceMappingURL comments is not exploitable in our production client bundle.

### `axios`
* **Severity**: High
* **Advisory**: Multiple (e.g., [GHSA-pjwm-pj3p-43mv](https://github.com/advisories/GHSA-pjwm-pj3p-43mv))
* **Rationale**: Transitive dependency used by third-party tooling, not exposed directly in our main application logic or user-facing APIs.

### `brace-expansion`
* **Severity**: Moderate
* **Advisory**: [GHSA-jxxr-4gwj-5jf2](https://github.com/advisories/GHSA-jxxr-4gwj-5jf2)
* **Rationale**: Transitive devDependency used by ESLint tools. Does not affect production runtime.

### `form-data`
* **Severity**: High
* **Advisory**: [GHSA-hmw2-7cc7-3qxx](https://github.com/advisories/GHSA-hmw2-7cc7-3qxx)
* **Rationale**: Transitive build/devDependency. The CRLF injection does not affect runtime application logic.

### `js-yaml`
* **Severity**: Moderate
* **Advisory**: [GHSA-h67p-54hq-rp68](https://github.com/advisories/GHSA-h67p-54hq-rp68)
* **Rationale**: Transitive dependency of eslint and other build-time tools.

### `next`
* **Severity**: High / Moderate
* **Advisories**: Multiple (e.g., [GHSA-267c-6grr-h53f](https://github.com/advisories/GHSA-267c-6grr-h53f))
* **Rationale**: We are using Next.js 16 (App Router) which is a pre-release version. Upstream patches will resolve these as stable releases roll out. These advisories do not currently impact our static build outputs or public client code.

### `postcss`
* **Severity**: Moderate
* **Advisory**: [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93)
* **Rationale**: Development/build-time dependency for processing CSS. XSS vulnerability is not active in the compiled static CSS asset.

### `undici`
* **Severity**: High / Moderate
* **Advisories**: Multiple (e.g., [GHSA-vmh5-mc38-953g](https://github.com/advisories/GHSA-vmh5-mc38-953g))
* **Rationale**: Transitive dependency of Next.js for network requests; not exposed directly to untrusted user input.

### `vite`
* **Severity**: High / Moderate
* **Advisories**: Multiple (e.g., [GHSA-fx2h-pf6j-xcff](https://github.com/advisories/GHSA-fx2h-pf6j-xcff))
* **Rationale**: Vite is a devDependency used for bundling and test runners. Local vulnerabilities do not affect the production site assets.
