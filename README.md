# Dongle-frontend

## Your Onchain App Store

### Overview

The Dongle frontend is the user-facing application that powers discovery, reviews, and verification of decentralized applications on Stellar. It provides an app-store-like experience while interacting directly with on-chain smart contracts for transparency, trust, and data integrity.

The frontend is responsible for presenting on-chain data in a usable interface and enabling users, developers, and admins to interact with the Dongle protocol through their wallets.

##  Core Features

### dApp Discovery
	•	Displays all registered dApps from the on-chain Project Registry
	•	Supports browsing by category (DeFi, NFTs, Gaming, Tools, DAOs, etc.)
	•	Enables sorting by highest-rated, trending, recently added, and verified projects

### Reviews and Ratings
	•	Users can submit a star rating (1–5) for any listed dApp
	•	Optional written reviews are supported and stored off-chain (IPFS), with references stored on-chain
	•	Aggregated ratings (average score and total reviews) are computed from on-chain data
	•	Each user can submit one review per project, with support for updates

### Verification Flow
	•	Project owners can request verification for their dApps
	•	Verification requests require a fee paid in Stellar assets (e.g., XLM or USDC)
	•	Evidence (audit reports, links, documentation) is uploaded off-chain and referenced on-chain
	•	Verification status is clearly displayed on project pages

### Wallet Integration
	•	Users connect their Stellar wallet to interact with the platform
	•	All write actions (reviews, verification requests, admin decisions) require wallet signatures
	•	Read-only access is available without a wallet connection


## How the Frontend Works

### Data Flow
	1.	The frontend reads project data, reviews, and verification status directly from Stellar smart contracts via RPC calls.
	2.	Off-chain data such as images, long reviews, and verification evidence are fetched from IPFS using stored CIDs.
	3.	User actions trigger contract calls that are signed and submitted through the connected wallet.
	4.	The UI updates by re-fetching on-chain state or listening to indexed contract events.

### Smart Contract Interaction

The frontend interacts with multiple deployed contracts:
	•	Project Registry for listing and managing dApps
	•	Review Registry for ratings and reviews
	•	Verification Registry for verification requests and status
	•	Fee Manager for handling verification payments

Contract addresses are configured via environment variables to support multiple networks (testnet and mainnet).


## User Roles

### Users
	•	Browse and search for dApps
	•	Submit ratings and reviews
	•	View verification status and community feedback

### Project Owners
	•	Register and manage dApp listings
	•	Request verification and pay verification fees
	•	Monitor reviews and ratings for their projects

### Admins / Verifiers
	•	Review verification requests
	•	Approve, reject, suspend, or revoke verification
	•	Manage verification policies and fees (if enabled in the UI)


### Frontend Architecture
	•	Framework: Modern React-based stack (e.g., Next.js or Vite)
	•	State Management: Handles wallet state, contract data, and UI state
	•	Blockchain Layer: Stellar RPC and smart contract SDK
	•	Storage: IPFS for images, reviews, and verification evidence
	•	Styling: Component-based UI system for consistency and scalability

The frontend is designed to be modular, allowing easy expansion to other chains in the future.

## Purpose and Vision

The Dongle frontend makes on-chain discovery usable and intuitive. It bridges the gap between decentralized infrastructure and everyday users by presenting verifiable, transparent data in a familiar app-store experience.

Dongle aims to become the default discovery layer for decentralized applications, starting with Stellar and expanding across ecosystems.
