# Setup Guide - Dependency Installation & Testing

This guide addresses dependency installation issues, particularly with native bindings required by Vitest and build tools.

## Quick Start

```bash
npm install
npm test
```

## Prerequisites

- **Node.js**: 20.x LTS (pinned & supported version)
- **npm**: 10.x or higher
- [Freighter Wallet](https://freighter.app/) - Browser extension for Stellar wallet

## Supported Platforms

This project uses native dependencies for build tools that are platform-specific:
- **macOS (Apple Silicon)**: `@rolldown/binding-darwin-arm64`
- **macOS (Intel)**: `@rolldown/binding-darwin-x64`
- **Linux (x64)**: `@rolldown/binding-linux-x64`
- **Windows (x64)**: `@rolldown/binding-win32-x64`

The lockfile (`package-lock.json`) includes all platform variants. npm will automatically install only the correct binding for your platform.

## Installation

```bash
# Install dependencies
npm install

# If you encounter issues with native bindings:
npm ci  # Use clean install for CI/CD or locked environments
```

**Native Dependency Notes**:
- Native bindings are automatically resolved and installed for your platform
- The `package-lock.json` tracks the dependency tree including platform-specific builds
- If npm fails to install, ensure you have:
  - Python 3.x installed and in PATH
  - Build tools for your platform (Xcode on macOS, MSVC on Windows, gcc/make on Linux)
  - Sufficient disk space for node_modules (~800MB+)

## Development

```bash
# Run development server
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run linter
npm run lint

# Build for production
npm run build

# Start production server
npm start
```

## Troubleshooting

### Missing @rolldown/binding errors

**Error:**
```
Cannot find module '@rolldown/binding-*'
```

**Cause:**
Vitest uses Rolldown, which requires native bindings compiled for your platform. These are optional dependencies that npm should install automatically.

**Solutions:**

1. **Clean reinstall (recommended)**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Use clean install with existing lockfile**
   ```bash
   npm ci
   ```

3. **Manual platform-specific binding installation**

   Windows (x64):
   ```bash
   npm install --no-save @rolldown/binding-win32-x64
   ```

   macOS (Apple Silicon):
   ```bash
   npm install --no-save @rolldown/binding-darwin-arm64
   ```

   macOS (Intel):
   ```bash
   npm install --no-save @rolldown/binding-darwin-x64
   ```

   Linux (x64):
   ```bash
   npm install --no-save @rolldown/binding-linux-x64
   ```

### Tests fail immediately with native module errors

**Solutions:**

1. **Verify Node.js version**
   ```bash
   node --version
   npm --version
   ```
   - Node.js: 20.x LTS
   - npm: 10.x or higher

2. **Install build tools**
   
   **macOS:**
   ```bash
   xcode-select --install
   ```
   
   **Windows:**
   - Install Visual Studio Build Tools with C++ workload
   - Or: `npm install -g windows-build-tools`
   
   **Linux (Ubuntu/Debian):**
   ```bash
   sudo apt-get install build-essential python3
   ```
   
   **Linux (Fedora/RHEL):**
   ```bash
   sudo dnf install gcc-c++ make python3
   ```

3. **Ensure Python is available**
   ```bash
   python --version
   # or
   python3 --version
   ```

### npm install hangs or times out

**Solutions:**

1. **Increase npm timeout**
   ```bash
   npm install --fetch-timeout=120000
   ```

2. **Check disk space**
   ```bash
   # macOS/Linux
   df -h
   
   # Windows
   Get-Volume
   ```
   Need at least 1GB free space for node_modules

3. **Clear npm cache**
   ```bash
   npm cache clean --force
   npm install
   ```

## Verifying Installation

After installation, verify everything is set up correctly:

```bash
# Check dependencies
npm ls

# Run tests
npm test

# Run linter
npm run lint

# Build project
npm run build
```

## Node.js & npm Versions

**Supported:**
- Node.js: 20.x LTS (pinned)
- npm: 10.x or higher

**Installation:**
- [Node.js Official](https://nodejs.org/) - Download LTS
- macOS: `brew install node@20`
- Linux: `nvm install 20`

## CI/CD Integration

For GitHub Actions or other CI systems, the project is configured to:
- Run tests on Node 20.x
- Verify dependency lockfile is up to date
- Run linter with zero warnings
- Build project successfully

See `.github/workflows/` for workflow configurations.

## Environment Variables

Create a `.env.local` file in the `dongle` directory with:

```env
# Optional - Defaults to testnet if not specified
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org:443
NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
```

## Additional Notes

- **Platform-specific installs**: npm automatically resolves the correct binding for your platform
- **Lockfile**: `package-lock.json` includes all platform variants; only the correct one installs
- **Cache**: Native bindings are cached in npm's cache directory; clear if experiencing issues
- **Disk space**: Full node_modules is ~1GB; ensure sufficient space before installing

## Still Having Issues?

1. Check Node.js is correct version: `node --version`
2. Try clean install: `rm -rf node_modules package-lock.json && npm install`
3. Check disk space and internet connection
4. Verify build tools are installed for your platform
5. Check [npm docs](https://docs.npmjs.com/) for platform-specific guidance
6. Open an issue on GitHub with output from `npm install --verbose`
