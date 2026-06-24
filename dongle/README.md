# Dongle

Dongle is a decentralized project directory and review platform for the Stellar and Soroban ecosystem. It enables users to discover, verify, and review projects built on Stellar, with wallet integration for on-chain interactions.

## Features

- **Project Discovery**: Browse and search through a catalog of Stellar/Soroban projects
- **Project Verification**: Request and track verification status for projects
- **Community Reviews**: Submit and read reviews for projects, with wallet-based authentication
- **Wallet Integration**: Seamless connection with Freighter wallet for Stellar transactions
- **Responsive Design**: Modern UI built with Next.js, Tailwind CSS, and shadcn/ui components

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS 4
- **Wallet**: @stellar/freighter-api
- **Blockchain**: stellar-sdk (Stellar/Soroban)
- **Forms**: react-hook-form with Zod validation
- **Testing**: Vitest with React Testing Library
- **Language**: TypeScript

## Prerequisites

- **Node.js**: 18.x LTS or higher (20.x LTS recommended)
- **npm**: 9.x or higher (or use pnpm for better dependency management)
- [Freighter Wallet](https://freighter.app/) - Browser extension for Stellar wallet

## Getting Started

### Installation

```bash
# Install dependencies using npm
npm install

# OR using pnpm (recommended for faster installations and better lockfile handling)
pnpm install
```

**Note**: This project uses optional native dependencies for build tools (e.g., `@rolldown/binding-*`). pnpm handles these more reliably than npm. If you encounter native dependency issues with npm, try `pnpm install` instead.

### Development

```bash
# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The application will hot-reload as you make changes.

### Build

```bash
# Create a production build
npm run build

# Start the production server
npm start
```

### Quality Checks

```bash
# Run ESLint
npm run lint

# Run tests
npm run test

# Run tests in watch mode
npm run test:watch
```

## Wallet Setup

Dongle requires the Freighter wallet extension for Stellar interactions:

1. Install [Freighter](https://freighter.app/) in your browser
2. Create or import a Stellar wallet
3. Ensure you're on the correct network (testnet for development)
4. Connect your wallet through the app's wallet connection flow

## Environment Variables

The application requires specific environment variables for smart contract interactions. In development (`NODE_ENV=development` or `test`), safe default placeholders are provided. However, for production builds, these are **strictly required and validated** at startup.

Create a `.env` or `.env.local` file in the `dongle` directory with the following variables:

```env
# Stellar Soroban Contract IDs (Required in production)
# Must be valid 56-character base32 encoded Stellar contract IDs starting with 'C'
NEXT_PUBLIC_PROJECT_REGISTRY_CONTRACT=CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
NEXT_PUBLIC_REVIEW_REGISTRY_CONTRACT=CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
NEXT_PUBLIC_VERIFICATION_REGISTRY_CONTRACT=CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA

# Stellar Network Configuration (Optional, defaults to testnet)
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org:443
NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"

# Admin Access Control
# Comma-separated list of Stellar public keys authorized to access the admin dashboard.
# Any connected wallet NOT in this list will be denied access, even if it is connected.
# Example: NEXT_PUBLIC_ADMIN_ALLOWLIST=GABC...1234,GDEF...5678
NEXT_PUBLIC_ADMIN_ALLOWLIST=
```

If these are invalid or missing in production, the application will throw a clear validation error upon initialization.

## Project Structure

```
dongle/
├── app/                    # Next.js app router pages
│   ├── discover/          # Project discovery page
│   ├── projects/          # Project detail and creation
│   ├── reviews/           # Community reviews
│   └── verify/            # Project verification
├── components/            # Reusable React components
│   ├── projects/         # Project-specific components
│   ├── reviews/          # Review components
│   ├── ui/               # UI components (shadcn/ui)
│   └── layout/           # Layout wrappers
├── services/             # Business logic services
│   ├── wallet/           # Wallet connection service
│   ├── stellar/          # Stellar/Soroban interactions
│   └── review/           # Review persistence service
├── context/              # React context providers
├── hooks/                # Custom React hooks
├── data/                 # Mock data
├── types/                # TypeScript type definitions
└── lib/                  # Utility functions
```

## Development Limitations

This is a development prototype with the following limitations:

- **Mock Data**: Projects and reviews use local mock data (`data/mockProjects.ts`)
- **Local Storage**: Reviews are stored in localStorage only, not persisted across devices
- **No On-Chain Transactions**: Wallet connection works, but actual blockchain transactions are not implemented
- **Testnet Only**: Designed for Stellar testnet; mainnet integration requires additional configuration
- **No Backend**: Currently client-side only; API integration planned for production

## Future Enhancements

- Backend API for persistent data storage
- Real on-chain project registration and verification
- Mainnet support
- Advanced search and filtering
- User profiles and reputation system
- Project analytics and metrics

## Contributing

Contributions are welcome! Please ensure:

- Code passes `npm run lint` with no warnings
- Tests pass with `npm run test`
- New features include appropriate tests
- Commits follow conventional commit format

## License

[Specify your license here]

## Support

For issues or questions, please open an issue on the GitHub repository.
