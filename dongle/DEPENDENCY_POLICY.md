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

**Rule:** never silence a new advisory by skipping CI. Add it here *and* in `scripts/audit-check.js` with a clear rationale, or upgrade/fix the package.

### `@babel/core`
* **Severity**: Low / Moderate
* **Advisory**: [GHSA-4x5r-pxfx-6jf8](https://github.com/advisories/GHSA-4x5r-pxfx-6jf8)
* **Rationale**: This is a build/devDependency. The arbitrary file read vulnerability via sourceMappingURL comments is not exploitable in our production client bundle.

### `axios`
* **Severity**: High
* **Advisories**: Multiple (see `scripts/audit-check.js` for the full allow-list)
* **Rationale**: Transitive dependency used by third-party tooling, not exposed directly in our main application logic or user-facing APIs.

### `brace-expansion`
* **Severity**: High / Moderate
* **Advisories**: [GHSA-jxxr-4gwj-5jf2](https://github.com/advisories/GHSA-jxxr-4gwj-5jf2), [GHSA-3jxr-9vmj-r5cp](https://github.com/advisories/GHSA-3jxr-9vmj-r5cp), [GHSA-mh99-v99m-4gvg](https://github.com/advisories/GHSA-mh99-v99m-4gvg)
* **Rationale**: Transitive devDependency used by ESLint tools. Does not affect production runtime.

### `form-data`
* **Severity**: High
* **Advisory**: [GHSA-hmw2-7cc7-3qxx](https://github.com/advisories/GHSA-hmw2-7cc7-3qxx)
* **Rationale**: Transitive build/devDependency. The CRLF injection does not affect runtime application logic.

### `js-yaml`
* **Severity**: High / Moderate
* **Advisories**: [GHSA-h67p-54hq-rp68](https://github.com/advisories/GHSA-h67p-54hq-rp68), [GHSA-52cp-r559-cp3m](https://github.com/advisories/GHSA-52cp-r559-cp3m)
* **Rationale**: Transitive dependency of eslint and other build-time tools.

### `next`
* **Severity**: High / Moderate
* **Advisories**: Multiple (see `scripts/audit-check.js`)
* **Rationale**: We are on Next.js 16 (App Router). Upstream patches will resolve these as stable releases roll out. Revisit during the quarterly framework upgrade; confirm wallet/Stellar flows still pass after upgrading.

### `postcss`
* **Severity**: High / Moderate
* **Advisories**: [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93), [GHSA-6g55-p6wh-862q](https://github.com/advisories/GHSA-6g55-p6wh-862q), [GHSA-r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849)
* **Rationale**: Development/build-time dependency for processing CSS. XSS / source-map issues are not active in the compiled static CSS asset.

### `sharp`
* **Severity**: High
* **Advisory**: [GHSA-f88m-g3jw-g9cj](https://github.com/advisories/GHSA-f88m-g3jw-g9cj)
* **Rationale**: Transitive Next.js image dependency (libvips). Not exposed via an untrusted image-processing pipeline in this app.

### `undici`
* **Severity**: High / Moderate
* **Advisories**: Multiple (see `scripts/audit-check.js`)
* **Rationale**: Transitive dependency of Next.js for network requests; not exposed directly to untrusted user input.

### `vite`
* **Severity**: High / Moderate
* **Advisories**: [GHSA-v6wh-96g9-6wx3](https://github.com/advisories/GHSA-v6wh-96g9-6wx3), [GHSA-fx2h-pf6j-xcff](https://github.com/advisories/GHSA-fx2h-pf6j-xcff)
* **Rationale**: Vite is a devDependency used for bundling and test runners. Local vulnerabilities do not affect the production site assets.
