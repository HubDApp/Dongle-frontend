# ADR 0002: IPFS for off-chain media and evidence

- **Status:** Accepted
- **Date:** 2026-08-26
- **Deciders:** Dongle frontend

## Context

On-chain Stellar/Soroban storage is expensive and poorly suited to images, long-form reviews, and verification evidence (audit PDFs, screenshots). The product still needs those blobs to be:

1. **Content-addressed** — a CID proves the file has not been swapped
2. **Publicly fetchable** in the browser without Dongle running a media CDN as a single point of failure
3. **Referenced from contracts** as a short string (CID / URI), not as raw bytes

A conventional REST API (`POST /uploads` → `https://api.dongle.app/files/...`) is simpler to ship, but it recentralizes media, makes takedowns and URL rot the platform's problem, and severs the link between “what the contract stored” and “what the user sees.”

The Next.js app already allows IPFS and Arweave hostnames in `next.config.ts` image remote patterns (`ipfs.io`, `*.ipfs.dweb.link`, `arweave.net`).

## Decision

Treat **IPFS (and compatible content-addressed storage) as the off-chain blob layer**. Contracts and the UI store **CIDs / `ipfs://` URIs**, not vendor URLs.

Frontend responsibilities:

- Render images through Next.js `<Image>` using public gateways listed in `next.config.ts`
- Accept user-supplied HTTP(S) URLs during MVP (GitHub raw, Cloudinary, etc.) while the upload pipeline is incomplete
- Prefer CIDs for reviews, logos, and verification evidence once the upload flow lands
- Never embed large payloads in Soroban contract arguments

The API / Horizon RPC remains the source of **structured** data (project IDs, ratings, verification status). IPFS is only for **opaque bytes**.

## Consequences

**Positive**

- Media integrity: the CID in the contract matches the bytes the gateway returns
- Gateways are swappable; pinning can move without rewriting listings
- Aligns with the product goal of a decentralized app store

**Negative**

- Gateway latency and availability are worse than a first-party CDN
- Users must pin content (or we must pin on their behalf) or files vanish
- Next.js image optimization still proxies through our server for allowed hostnames

**Follow-up**

- Add an explicit upload helper (web3.storage / Pinata / NFT.Storage) rather than asking users to paste gateway URLs
- Document a gateway fallback list if `ipfs.io` is rate-limited
- Keep Arweave as a sibling option for permanent evidence, not a replacement for IPFS CIDs in contract fields

## Alternatives

| Alternative | Why not |
|-------------|---------|
| **First-party REST + S3** | Fast and familiar, but listings become Dongle-hosted. Breaks the “on-chain reference ↔ immutable blob” story. Fine as a *pinning* backend behind IPFS, not as the public URL scheme. |
| **On-chain only** | Impractical for images and PDFs; would blow contract size and fees. |
| **Arweave only** | Strong permanence, weaker ecosystem for mutable dApp logos and a higher cost floor. Allowed as an additional origin, not the default. |
| **Store files in git / GitHub** | Acceptable for OSS project logos in MVP (`raw.githubusercontent.com` is already allowlisted). Not suitable for user reviews or verification packets. |
