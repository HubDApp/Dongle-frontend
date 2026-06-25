# Dongle

Dongle is a decentralized app store and review platform for the Stellar ecosystem. It provides a transparent, community-driven way to discover, verify, and review projects built on Stellar and Soroban.

## What is Dongle?

Dongle solves the problem of trust and discoverability in the Stellar ecosystem. Users can:

- **Discover Projects**: Browse a comprehensive catalog of Stellar/Soroban applications
- **Submit Projects**: Register your project for community discovery and verification
- **Request Verification**: Submit projects for community or admin verification
- **Leave Reviews**: Rate and review projects with wallet-based authentication to prevent spam
- **Track Status**: Monitor verification requests and view community feedback

All interactions are wallet-authenticated using Freighter, providing transparent attribution and preventing duplicates.

## Key Features

- **Decentralized Listings**: Project data and reviews are persisted through smart contracts (planned for production)
- **Wallet-Based Authentication**: All user actions attributed to Stellar wallet addresses
- **Verification System**: Multi-status lifecycle (pending, verified, rejected) for project credibility
- **Community Reviews**: 5-star rating system with detailed comments
- **Responsive Design**: Modern, accessible UI built with Next.js, Tailwind CSS, and Lucide icons

## Tech Stack

- **Framework**: Next.js 16 (App Router, SSR-ready)
- **Styling**: Tailwind CSS 4 with dark mode support
- **Wallet Integration**: Freighter API (@stellar/freighter-api)
- **Blockchain**: Stellar SDK and Soroban for contract interactions
- **Forms**: react-hook-form with Zod schema validation
- **Testing**: Vitest with React Testing Library
- **State Management**: React Context + Custom Hooks
- **Language**: TypeScript (strict mode)

## Prerequisites

Before getting started, ensure you have:

- **Node.js**: 20.x LTS (version pinned in `.nvmrc`)
- **npm**: 10.x or higher (or pnpm 10.x recommended)
- [Freighter Wallet](https://freighter.app/) - Browser extension required for wallet interactions
- A Stellar testnet account (can be created and funded through Freighter or Friendbot)

## Getting Started

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd Dongle-frontend/dongle

# Install dependencies (npm)
npm install

# OR install with pnpm (recommended for faster installation)
pnpm install
```

**Note on Dependencies**: This project includes optional native dependencies (`@rolldown/binding-*`) for build optimization. pnpm handles these more reliably than npm. If you encounter native dependency issues with npm, use `pnpm install` instead.

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The app reloads automatically as you edit files (hot module replacement enabled).

**Important**: Before using the app, ensure:
1. Freighter wallet is installed and unlocked
2. Your wallet is connected to **Stellar Testnet**
3. Your account has been funded (use [Friendbot](https://laboratory.stellar.org/#account-creator) if needed)

### Quality Checks

Run these commands to ensure code quality:

```bash
# Lint code with ESLint (must pass with 0 warnings)
npm run lint

# Type check with TypeScript (catches type errors)
npm run typecheck

# Run all tests (unit and integration)
npm run test

# Run tests in watch mode (development)
npm run test:watch

# Security audit for vulnerable dependencies
npm run audit
```

### Build & Production

```bash
# Create an optimized production build
npm run build

# Test production build locally
npm start
```

The production build performs additional validation of environment variables (see below).

## Wallet Setup (Required)

Dongle requires the Freighter wallet extension to interact with the application. Freighter handles secure key management and transaction signing.

### Installation & Configuration

1. **Install Freighter**: Download from [freighter.app](https://freighter.app/) for your browser (Chrome, Firefox, Safari, or Edge)

2. **Create or Import a Wallet**:
   - Create a new Stellar account in Freighter, or
   - Import an existing account using a secret key

3. **Switch to Testnet** (critical for development):
   - Open Freighter settings
   - Select **Network: Testnet**
   - This matches the app's default RPC endpoint

4. **Fund Your Account**:
   - New accounts are empty and require funding to interact with the app
   - Use [Friendbot](https://laboratory.stellar.org/#account-creator) to fund your testnet account with 10,000 XLM
   - Paste your Stellar public key (starts with `G`) and click "Get Lumens"

5. **Connect in Dongle**:
   - Click "Connect Wallet" button in the app header
   - Approve the connection request in Freighter
   - Your wallet address now appears in the profile/navigation

### Troubleshooting

| Issue | Solution |
|-------|----------|
| "Connect Wallet" button does nothing | Ensure Freighter is installed and unlocked |
| "Wrong network" error appears | Freighter is on mainnet. Switch to Testnet in Freighter settings |
| Account not found / 404 error | Testnet account not funded. Use Friendbot to fund it |
| Wallet won't connect | Try refreshing page or restarting browser |

## Environment Variables

Dongle requires configuration for Soroban smart contract interactions and network settings. The application validates these at startup (especially in production builds).

### Setup Instructions

1. Create a `.env.local` file in the `dongle/` directory
2. Copy the example below and customize as needed
3. For **development**, most variables have safe defaults and are optional
4. For **production builds**, all variables must be explicitly set

### Configuration File (`.env.local`)

```env
# ============================================
# SOROBAN SMART CONTRACTS (Required in production)
# ============================================
# Stellar contract IDs for Dongle protocol smart contracts
# Format: Must start with 'C' followed by 55 base32 characters (e.g., CAAAA...)
# In development, defaults to placeholder contracts if not set

NEXT_PUBLIC_PROJECT_REGISTRY_CONTRACT=CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
NEXT_PUBLIC_REVIEW_REGISTRY_CONTRACT=CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
NEXT_PUBLIC_VERIFICATION_REGISTRY_CONTRACT=CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA

# ============================================
# STELLAR NETWORK CONFIGURATION (Optional)
# ============================================
# RPC endpoint for Soroban interactions
# Default (development): https://soroban-testnet.stellar.org:443
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org:443

# Network passphrase - must match Freighter's network selection
# Default (development): "Test SDF Network ; September 2015"
NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"

# ============================================
# ADMIN ACCESS CONTROL (Optional)
# ============================================
# Comma-separated list of Stellar public keys (G...) authorized for admin dashboard
# Leave empty to disable admin features
# Example: GABC...XYZ1,GDEF...XYZ2
NEXT_PUBLIC_ADMIN_ALLOWLIST=
```

### Environment Variable Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_PROJECT_REGISTRY_CONTRACT` | Production only | Placeholder in dev | Smart contract ID for project registry |
| `NEXT_PUBLIC_REVIEW_REGISTRY_CONTRACT` | Production only | Placeholder in dev | Smart contract ID for review registry |
| `NEXT_PUBLIC_VERIFICATION_REGISTRY_CONTRACT` | Production only | Placeholder in dev | Smart contract ID for verification requests |
| `NEXT_PUBLIC_SOROBAN_RPC_URL` | No | Testnet RPC | Soroban RPC endpoint URL |
| `NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE` | No | Testnet passphrase | Stellar network identifier |
| `NEXT_PUBLIC_ADMIN_ALLOWLIST` | No | (empty) | Comma-separated admin wallet addresses |

### Contract ID Format

Contract IDs must follow the Stellar contract ID format:
- Start with `C`
- Followed by exactly 55 base32 characters (uppercase letters A-Z and digits 2-7)
- Total length: 56 characters
- Example: `CAE7WTI3X5HZQCDT5O3EH7FVDX7VKJP3WVLVZM3NUJSQFXLW5UQ4SVQ`

### Getting Production Contract IDs

To deploy Dongle to production:

1. Deploy the smart contracts to Stellar mainnet using Soroban CLI
2. Copy the resulting contract IDs into your `.env` file
3. Ensure network passphrase matches (different for mainnet vs testnet)
4. Run `npm run build` - it will validate all env vars before building

### Validation & Error Handling

- **Development** (`NODE_ENV=development`): Invalid env vars use safe defaults and log warnings
- **Test** (`NODE_ENV=test`): Invalid env vars use safe defaults
- **Production** (`NODE_ENV=production`): Invalid env vars cause build/startup failure with clear error messages

Example error output:
```
Environment Validation Error:
- NEXT_PUBLIC_PROJECT_REGISTRY_CONTRACT: Invalid Stellar Contract ID format
- NEXT_PUBLIC_SOROBAN_RPC_URL: Invalid URL
```

## Project Structure

```
dongle/
├── app/                           # Next.js App Router pages and layouts
│   ├── discover/                 # Project discovery page - search, filter, sort
│   ├── projects/
│   │   ├── new/                  # Submit new project form
│   │   └── [id]/
│   │       ├── edit/             # Edit project (owner only)
│   │       └── [id]/page.tsx     # Project detail view with reviews
│   ├── profile/                  # User profile - wallet info, submitted projects, reviews
│   ├── reviews/                  # View all user reviews
│   ├── verify/                   # Project verification request submission & status
│   ├── admin/                    # Admin dashboard (protected by ADMIN_ALLOWLIST)
│   ├── layout.tsx                # Root layout with providers
│   ├── globals.css               # Global Tailwind styles
│   └── error.tsx, not-found.tsx  # Error boundary pages
│
├── components/                    # Reusable React components
│   ├── layout/
│   │   ├── Navbar.tsx            # Header with wallet connection
│   │   ├── Footer.tsx            # Footer with links
│   │   └── LayoutWrapper.tsx     # Main layout wrapper
│   ├── projects/
│   │   ├── ProjectCard.tsx       # Project card component
│   │   ├── ProjectForm.tsx       # Form for creating/editing projects
│   │   └── ProjectImage.tsx      # Project logo/image handler
│   ├── reviews/
│   │   ├── ReviewForm.tsx        # Review submission form
│   │   └── ReviewList.tsx        # Display reviews for a project
│   ├── verify/
│   │   ├── VerificationForm.tsx  # Submit verification request
│   │   └── VerificationStatus.tsx # Check verification status
│   ├── landing/
│   │   ├── Hero.tsx              # Landing page hero section
│   │   ├── Features.tsx          # Features overview
│   │   ├── FeaturedProjects.tsx  # Featured projects section
│   │   └── CTA.tsx               # Call-to-action section
│   └── ui/                       # Reusable UI components
│       ├── Button.tsx            # Button with loading states
│       ├── Card.tsx              # Card container
│       ├── Badge.tsx             # Status badges
│       ├── Input.tsx             # Form input
│       ├── FormField.tsx         # Form field wrapper
│       ├── SelectField.tsx       # Dropdown select
│       ├── TextAreaField.tsx     # Multi-line text input
│       ├── Spinner.tsx           # Loading spinner
│       ├── ConfirmDialog.tsx     # Confirmation modal
│       └── AddressDisplay.tsx    # Stellar address display with copy
│
├── services/                      # Business logic & API communication
│   ├── wallet/
│   │   └── wallet.service.ts     # Freighter wallet integration
│   ├── stellar/
│   │   ├── stellar.service.ts    # Stellar SDK interactions (balances, transactions)
│   │   ├── soroban.service.ts    # Soroban contract calls
│   │   └── verification.service.ts # Verification request lifecycle
│   ├── review/
│   │   └── review.service.ts     # Review CRUD operations
│   └── project/
│       └── project.service.ts    # Project data access
│
├── context/                       # React Context providers
│   ├── wallet.context.tsx        # Wallet state & connection
│   └── [other contexts]
│
├── hooks/                         # Custom React hooks
│   ├── useStellarAccount.ts      # Fetch account data from Stellar
│   ├── useConfirm.ts            # Confirmation dialog hook
│   └── [other custom hooks]
│
├── types/                         # TypeScript type definitions
│   ├── project.ts                # Project types and categories
│   ├── review.ts                 # Review types and validation
│   └── [other types]
│
├── data/                          # Mock and static data
│   └── mockProjects.ts           # Mock project data for development
│
├── lib/                           # Utility functions
│   ├── utils.ts                  # Class name utilities (cn)
│   ├── date.ts                   # Date formatting
│   └── id-generator.ts           # Generate unique IDs
│
├── constants/                     # Configuration constants
│   └── contracts.ts              # Soroban contract IDs & env validation
│
├── __tests__/                     # Test files (mirror app structure)
│   ├── services/
│   └── components/
│
├── .env.local                     # Environment variables (create this)
├── package.json                   # Dependencies and scripts
├── tsconfig.json                  # TypeScript configuration
├── tailwind.config.ts             # Tailwind CSS configuration
├── next.config.ts                 # Next.js configuration
└── README.md                      # This file
```

### Key Architectural Patterns

**Context + Hooks Pattern**: Wallet and global state managed via React Context + custom hooks (no Redux needed)

**Service Layer**: Business logic isolated in services for testability and reusability

**Component Composition**: UI built from small, reusable components with clear props

**Type-Safe Forms**: react-hook-form with Zod schema validation for runtime type safety

## Development Limitations & Mock Data

This is a development prototype with the following known limitations. These are intentional design decisions for MVP development and will be addressed in production versions.

### Data Persistence

- **Projects**: Loaded from mock data (`src/data/mockProjects.ts`). Real projects come from smart contracts in production
- **Reviews**: Stored in browser `localStorage` only. Clearing browser data deletes all reviews
- **Verification Requests**: Also stored in localStorage with no persistence across devices or browsers
- **Account Data**: Balances and transactions are read from Stellar, but user metadata is not persisted

**Impact**: If you clear browser data or use a different device, all locally submitted reviews are lost.

### Blockchain Interactions

- **No On-Chain Transactions**: Wallet connection works, but actual contract calls are not implemented
- **Project Registration**: Clicking "Submit Project" saves to localStorage only, not to smart contract
- **Verification Workflow**: Status changes are local only and don't reflect admin decisions from a backend
- **Review Submission**: Reviews are local only and not visible to other users across devices

**Impact**: Multi-user collaboration is not supported. Each browser/device has its own isolated state.

### Network & Environment

- **Testnet Only**: Application is hardcoded for Stellar testnet by default
- **No Mainnet Support**: Production deployment requires network configuration changes
- **Freighter Required**: No alternative wallet support or key-import flows

**Impact**: Cannot connect to mainnet accounts or use hardware wallets directly.

### Known Issues & Workarounds

| Issue | Workaround |
|-------|-----------|
| Reviews disappear after clearing cache | Use dev tools to inspect localStorage before clearing |
| Verification status shows "NONE" after submitting | Status is randomly generated in dev. Refresh to see new value |
| Can't submit multiple projects with same name | No backend deduplication. Use unique names for testing |
| Buttons show loading indefinitely | Check browser console for errors. May be waiting for mock delays |
| Account shows "Account not found" | Make sure testnet account is funded with Friendbot |

### Planned for Production

- ✅ Real smart contract integration for projects, reviews, verification
- ✅ Backend API for persistent, shared data
- ✅ Admin dashboard with verification request management
- ✅ Mainnet support with network selection UI
- ✅ User profiles and reputation system
- ✅ Advanced search, filtering, and sorting
- ✅ Analytics and project metrics

## Common Development Tasks

### Running Linters & Type Checks

```bash
# Check for code style issues (ESLint)
npm run lint

# Check for TypeScript errors
npm run typecheck

# Both together (recommended before committing)
npm run lint && npm run typecheck
```

Fix auto-fixable linting issues:
```bash
npx eslint . --fix --ext .js,.jsx,.ts,.tsx
```

### Writing & Running Tests

```bash
# Run all tests once
npm run test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests for a specific file
npm run test -- services/review/review.service.test.ts
```

Test file location: `__tests__/` directory with same structure as source

### Debugging

**Console Logging**:
```typescript
// In components or services
console.log("[ComponentName]", variable);
```

**Browser DevTools**:
1. Open Chrome/Firefox DevTools (F12)
2. Go to "Sources" tab to set breakpoints
3. Go to "Console" tab to inspect state
4. Go to "Application" → "Local Storage" to check persisted data

**Next.js Debug Mode**:
```bash
NODE_OPTIONS='--inspect' npm run dev
# Then open chrome://inspect in Chrome
```

### Adding New Dependencies

```bash
npm install <package-name>

# For dev dependencies only
npm install --save-dev <package-name>

# Check for security vulnerabilities after adding
npm run audit
```

### Working with Styles

- All styles use Tailwind CSS utility classes
- Global styles in `app/globals.css`
- Dark mode: Add `dark:` prefix to any utility (e.g., `dark:bg-zinc-900`)
- Responsive: Use `sm:`, `md:`, `lg:` prefixes
- Color palette in `tailwind.config.ts`

### Creating New Pages

Next.js App Router structure:
```bash
# Create a new page at /my-feature
mkdir -p app/my-feature
echo "'use client';\n\nexport default function MyFeature() {\n  return <div>My Feature</div>;\n}" > app/my-feature/page.tsx

# Open http://localhost:3000/my-feature
```

## Contributing

Contributions are welcome! Please follow this workflow:

### Before Committing

1. Run quality checks and fix issues:
   ```bash
   npm run lint --fix  # Auto-fix code style
   npm run typecheck   # Check types
   npm run test        # Run tests
   ```

2. Ensure no console errors or warnings in browser

3. Test your changes manually in browser

### Commit Guidelines

Use conventional commit format:
```
feat: add verification status badge to project cards
fix: prevent duplicate review submissions
docs: update README with wallet setup instructions
test: add tests for review validation
chore: update dependencies
```

### Creating a Pull Request

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make changes and commit with conventional commits
3. Push to remote: `git push origin feature/my-feature`
4. Create PR with clear description of changes
5. Ensure CI pipeline passes (lint, type check, build)
6. Request review from team

### Code Review Checklist

- [ ] Code passes all linters (`npm run lint`)
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] Tests added/updated where applicable (`npm run test`)
- [ ] No console warnings or errors
- [ ] Commit messages follow conventional format
- [ ] Changes are well-documented
- [ ] No unnecessary dependencies added
- [ ] Backwards compatible or migration path documented

## API & Service Reference

### Wallet Service (`services/wallet/wallet.service.ts`)

```typescript
// Connect to Freighter wallet
const publicKey = await walletService.connectWallet();

// Get connected wallet's public key
const key = await walletService.getPublicKey();

// Check if wallet is connected
const connected = await walletService.isConnected();

// Get active network passphrase
const passphrase = await walletService.getNetworkPassphrase();

// Sign and send transaction
const signedXDR = await walletService.signTransaction(xdr, passphrase);

// Disconnect wallet
await walletService.disconnectWallet();
```

### Stellar Service (`services/stellar/stellar.service.ts`)

```typescript
// Fetch account info (balances, sequence number)
const account = await stellarService.getAccount(publicKey);
console.log(account.balances);

// Get recent transactions
const transactions = await stellarService.getTransactions(publicKey, limit = 10);

// Access Horizon server directly
const server = stellarService.getServer();
```

### Verification Service (`services/stellar/verification.service.ts`)

```typescript
// Submit verification request
const requestId = await verificationService.submitVerificationRequest(
  projectId,
  projectName,
  submittedBy
);

// Get verification status
const status = await verificationService.getVerificationStatus(projectId);
// Returns: "NONE" | "PENDING" | "VERIFIED" | "REJECTED"

// Get all requests by user
const requests = await verificationService.getVerificationRequestsByUser(userAddress);

// Admin: Approve request
await verificationService.approveRequest(projectId, adminAddress);

// Admin: Reject request with reason
await verificationService.rejectRequest(projectId, adminAddress, "Doesn't meet criteria");
```

### Review Service (`services/review/review.service.ts`)

```typescript
// Get all reviews
const reviews = reviewService.getReviews();

// Submit review (validates and prevents duplicates)
const result = reviewService.addReview(
  { projectId, rating, comment },
  userAddress
);

// Get reviews for a project
const projectReviews = reviewService.getReviewsByProject(projectId);

// Get reviews by user
const userReviews = reviewService.getReviewsByUser(userAddress);

// Update review (owner only)
reviewService.updateReview(reviewId, { rating, comment }, userAddress);

// Delete review (owner only)
reviewService.deleteReview(reviewId, userAddress);
```

### Hooks

```typescript
// useStellarAccount: Fetch and monitor account data
const { account, balances, loading, error, refetch } = useStellarAccount();

// useWallet: Access wallet state and connection methods
const { 
  publicKey, 
  isConnected, 
  isConnecting, 
  connectWallet, 
  disconnectWallet,
  isCorrectNetwork,
  walletNetworkLabel
} = useWallet();

// useConfirm: Show confirmation dialog
const confirm = useConfirm();
const result = await confirm({
  title: "Delete review?",
  description: "This action cannot be undone.",
  confirmText: "Delete",
  destructive: true
});
```

## Troubleshooting

### "Wallet connection failed"

**Causes & Solutions**:
- [ ] Freighter not installed → Install from [freighter.app](https://freighter.app/)
- [ ] Freighter not unlocked → Unlock wallet in Freighter extension
- [ ] Browser doesn't support extensions → Use Chrome, Firefox, Safari, or Edge
- [ ] Permissions denied → Check browser's permission prompts

### "Wrong network" error

**Root cause**: Freighter is on a different network than the app expects

**Solution**:
1. Open Freighter extension
2. Click network selector at top
3. Choose "Testnet" for development
4. Refresh the app

### "Account not found" (404 error)

**Root cause**: Testnet account hasn't been funded

**Solution**:
1. Get your Stellar testnet address (starts with `G`) from Freighter
2. Go to [Friendbot](https://laboratory.stellar.org/#account-creator)
3. Paste your address and click "Get Lumens"
4. Wait ~10 seconds and refresh the app

### Reviews disappear after closing browser

**Expected behavior** (in development): Reviews stored in localStorage are deleted when:
- Browser cache is cleared
- Private/Incognito window is closed
- localStorage is manually cleared

**Workaround**: Export localStorage before clearing:
1. Open DevTools (F12)
2. Go to "Application" → "Local Storage" → `http://localhost:3000`
3. Copy `dongle_reviews` and `dongle_verification_requests` values
4. Save to a file before clearing cache

### Buttons stuck in loading state

**Causes**:
- Network request failed silently (check browser console)
- Mock async operation was interrupted
- Error thrown but not caught

**Solution**:
1. Open browser console (F12 → Console)
2. Look for error messages in red
3. Check network tab for failed requests
4. Report error with console output

### Styles not updating / Tailwind not working

**Causes**:
- Tailwind build process not running
- Class name not recognized by Tailwind

**Solution**:
```bash
# Ensure dev server is running (rebuilds on file changes)
npm run dev

# If styles still broken, restart dev server
# Kill process (Ctrl+C) and run npm run dev again

# Check tailwind.config.ts includes all template paths
cat tailwind.config.ts
```

### TypeScript errors in IDE but no error in browser

**Cause**: IDE using different TypeScript version than project

**Solution**:
```bash
# Use project's TypeScript version in VSCode:
# 1. Open Command Palette (Ctrl+Shift+P)
# 2. Type "TypeScript: Select TypeScript Version"
# 3. Choose "Use Workspace Version"
```

## Support & Resources

- **Stellar Docs**: [developers.stellar.org](https://developers.stellar.org/)
- **Soroban Docs**: [soroban.stellar.org](https://soroban.stellar.org/)
- **Next.js Docs**: [nextjs.org](https://nextjs.org/)
- **Tailwind CSS**: [tailwindcss.com](https://tailwindcss.com/)
- **React Docs**: [react.dev](https://react.dev/)

## License

[Specify your license here]

## Support

For issues or questions:
- Open an issue on GitHub
- Check existing issues first
- Include reproduction steps and browser console output
