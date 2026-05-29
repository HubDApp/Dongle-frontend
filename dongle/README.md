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

- Node.js 18+ 
- npm or yarn
- [Freighter Wallet](https://freighter.app/) - Browser extension for Stellar wallet

## Getting Started

### Installation

```bash
# Install dependencies
npm install
```

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

Currently, the application uses mock data and local storage for development. No environment variables are required for the basic functionality.

For production deployment with real blockchain integration, you may need:

```env
# Stellar Network Configuration (future)
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org

# API Endpoints (future)
NEXT_PUBLIC_API_URL=https://api.dongle.io
```

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
