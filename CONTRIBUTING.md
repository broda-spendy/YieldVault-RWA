# Contributing to YieldVault-RWA

Thanks for your interest in contributing! This guide covers everything you need to get set up and start contributing.

## Prerequisites

- **Node.js** ≥ 20 (for frontend)
- **Rust** ≥ 1.75 with `wasm32-unknown-unknown` target (for Soroban contracts)
- **Stellar CLI** (`stellar`) for contract deployment
- **pnpm** (recommended) or npm for package management

```bash
# Install Rust target
rustup target add wasm32-unknown-unknown

# Install Stellar CLI
cargo install --locked stellar-cli
```

## Repository Structure

```
YieldVault-RWA/
├── contracts/vault/     # Soroban smart contracts (Rust)
├── frontend/            # React + Vite + TypeScript frontend
├── docs/                # PRD, Architecture, API docs
└── scripts/             # Build/deploy helpers
```

## Local Development Setup

### 1. Frontend

```bash
cd frontend
npm install          # or pnpm install
npm run dev          # starts dev server at http://localhost:5173
```

### 2. Soroban Contracts

```bash
cd contracts/vault
cargo test           # runs unit tests
cargo build --target wasm32-unknown-unknown --release  # builds WASM
```

### 3. Local Soroban Sandbox (optional)

For full integration testing:

```bash
# Start local Soroban RPC + Horizon
docker run --rm -it \
  -p 8000:8000 \
  -p 8001:8001 \
  stellar/quickstart:latest \
  --standalone

# Deploy contract to local network
cd contracts/vault
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/vault.wasm \
  --source-account <local-account> \
  --network standalone \
  --rpc-url http://localhost:8000
```

## Running Tests

### Frontend Tests

```bash
cd frontend

# Unit tests (Vitest)
npm run test:run           # CI mode
npm run test               # watch mode
npm run test:ui            # visual UI

# E2E tests (Playwright)
npm run test:e2e           # headless
npm run test:e2e:ui        # with UI
npm run test:e2e:debug     # debug mode
```

### Contract Tests

```bash
cd contracts/vault
cargo test                 # all tests
cargo test -- --nocapture  # with stdout
```

### All Tests (CI pipeline)

```bash
# From repo root
npm run build --prefix frontend      # TypeScript + Vite build
npm run test:run --prefix frontend   # frontend unit tests
npm run test:e2e --prefix frontend   # E2E tests
cargo test --manifest-path contracts/vault/Cargo.toml
```

## Code Style & Quality

### Frontend (TypeScript/React)

```bash
cd frontend

# Type checking
npx tsc -b

# Linting
npm run lint

# Fix auto-fixable lint issues
npm run lint -- --fix

# Format (if prettier configured)
npx prettier --write .
```

**Rules to follow:**
- Strict TypeScript (`strict: true`, `verbatimModuleSyntax: true`)
- No unused locals/parameters (`noUnusedLocals`, `noUnusedParameters`)
- React Hooks exhaustive-deps
- ESLint security rules (`no-eval`, `no-script-url`, etc.)

### Contracts (Rust)

```bash
cd contracts/vault

# Format
cargo fmt --check

# Lint
cargo clippy -- -D warnings

# Test with coverage
cargo tarpaulin --out Html
```

## Pull Request Process

1. **Branch from `main`** — use descriptive names: `feat/vault-deposit`, `fix/wallet-reconnect`
2. **Keep PRs focused** — one logical change per PR
3. **Write tests** — new features need unit tests; bug fixes need regression tests
4. **Run the full test suite** before pushing
5. **Update docs** — if you change APIs, update `docs/api/` via `npm run docs:api`
6. **Link issues** — reference related issues in PR description (`Fixes #123`)

### PR Checklist

- [ ] `npm run build` passes (frontend)
- [ ] `npm run test:run` passes (frontend unit)
- [ ] `npm run test:e2e` passes (E2E)
- [ ] `cargo test` passes (contracts)
- [ ] `npm run lint` passes
- [ ] `cargo fmt --check && cargo clippy` pass
- [ ] Types are strict (no `any`, proper generics)
- [ ] Commit messages follow Conventional Commits

## Commit Message Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`

**Examples:**
```
feat(frontend): add deposit confirmation modal
fix(contracts): prevent integer overflow in share calc
docs: update API docs for v2 endpoints
test(e2e): add deposit flow regression test
```

## Regenerating Documentation

### Frontend API Docs

```bash
cd frontend
npm run docs:api
# Output: ../docs/api/frontend/
```

### Contract API Docs

```bash
cd contracts/vault
cargo doc --no-deps --document-private-items
# Output: target/doc/
```

## Deployment

### Testnet (Phase 3)

1. Build contracts: `cargo build --target wasm32-unknown-unknown --release`
2. Deploy via Stellar CLI with testnet RPC
3. Update `frontend/.env` with contract ID and testnet RPC URL
4. Deploy frontend to Vercel preview

### Mainnet (Phase 4)

Requires security audit approval. See [DEPLOYMENT.md](docs/deployment.md) (to be created).

## Getting Help

- **GitHub Discussions** — questions, ideas, RFCs
- **Stellar Discord** — `#soroban`, `#developers` channels
- **Issues** — bugs, feature requests (use templates)

## Code of Conduct

This project follows the [Contributor Covenant](https://www.contributor-covenant.org/). Be respectful, inclusive, and constructive.