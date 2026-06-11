# ParkSwift - Parking Management Platform

A monorepo for the ParkSwift parking management system using **pnpm** workspaces and **Nx** for build orchestration.

## 📁 Project Structure

```
parking/
├── apps/                    # Standalone applications
│   ├── admin-web/          # Admin dashboard (to be created)
│   ├── user-web/           # User portal (to be created)
│   └── api/                # Backend API (to be created)
├── packages/               # Shared packages/libraries
│   ├── ui/                # Component library (to be created)
│   ├── types/             # Shared TypeScript types (to be created)
│   ├── api-client/        # API client & hooks (to be created)
│   ├── utils/             # Utility functions (to be created)
│   └── auth/              # Auth utilities (to be created)
├── docs/                  # Documentation
├── nx.json                # Nx configuration
├── pnpm-workspace.yaml    # pnpm workspace config
└── package.json           # Root package.json
```

## 🚀 Quick Start

### Prerequisites

- **Node.js**: 20.11.0 or higher (see `.node-version`)
- **pnpm**: 8.0.0 or higher

### Installation

```bash
# Install dependencies
pnpm install

# Verify Nx setup
pnpm exec nx show projects

# Verify Nx configuration
pnpm exec nx report
```

## 📦 pnpm Workspace

This project uses **pnpm workspaces** for dependency management. All packages in `apps/` and `packages/` are automatically recognized as workspace members.

### Workspace benefits:
- Shared `node_modules` using symlinks (faster, smaller disk usage)
- Automatic handling of interdependencies
- Unified lockfile (`pnpm-lock.yaml`)

## ⚙️ Nx Integration

**Nx** provides:
- **Build orchestration**: Cache-aware builds across monorepo
- **Task execution**: Run tasks in dependency order
- **Affected analysis**: Only run tasks on changed packages

### Common Nx Commands

```bash
# Show all projects in the monorepo
pnpm exec nx show projects

# Run build on all projects
pnpm nx build

# Run tests on all projects
pnpm nx test

# Run lint on all projects
pnpm nx lint

# View task dependency graph
pnpm exec nx graph

# Check which projects are affected by changes
pnpm exec nx affected --target=build
```

## 🛠️ Development

### Adding a New App

Example: Creating `apps/admin-web`

```bash
cd apps
pnpm create vite admin-web -- --template react-ts
# or use Next.js generator (when available)
```

### Adding a New Package

Example: Creating `packages/ui`

```bash
pnpm exec nx generate @nx/js:library ui --directory=packages --buildable
```

### Path Aliases

The workspace uses TypeScript path aliases for clean imports:

```typescript
// Instead of:
import { Button } from '../../packages/ui/src/components'

// Use:
import { Button } from '@parkswift/ui/components'
```

Pre-configured paths in `tsconfig.base.json`:
- `@parkswift/ui/*` → `packages/ui/src/*`
- `@parkswift/types/*` → `packages/types/src/*`
- `@parkswift/api-client/*` → `packages/api-client/src/*`
- `@parkswift/utils/*` → `packages/utils/src/*`
- `@parkswift/auth/*` → `packages/auth/src/*`

## 📋 Scripts

Root-level scripts available via `pnpm`:

```bash
pnpm build        # Build all apps and packages
pnpm test         # Run tests across monorepo
pnpm lint         # Lint all code
pnpm format       # Format code with Prettier
pnpm format:check # Check formatting without changes
pnpm nx <cmd>     # Run any Nx command
```

## 🔧 Configuration Files

- **`package.json`** - Root dependencies & workspace scripts
- **`pnpm-workspace.yaml`** - Workspace glob patterns
- **`nx.json`** - Nx monorepo configuration
- **`tsconfig.base.json`** - Shared TypeScript configuration with path aliases
- **`.npmrc`** - pnpm settings (shamefully-hoist=false for clean node_modules)
- **`.prettierrc`** - Code formatting rules
- **`.node-version`** - Node.js version pinning (for nvm/fnm)

## 📚 Resources

- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Nx Docs](https://nx.dev)
- [Nx + pnpm Integration](https://nx.dev/recipes/tips-n-tricks/use-pnpm-workspaces)
- [TypeScript Path Aliases](https://www.typescriptlang.org/tsconfig#paths)

## 🤝 Contributing

When adding new features:
1. Create packages in `packages/` for reusable code
2. Create apps in `apps/` for standalone applications
3. Update path aliases in `tsconfig.base.json` if adding new packages
4. Use consistent naming: `@parkswift/package-name`

---

**Ready to add your first app?** Start with:
```bash
pnpm create vite apps/admin-web -- --template react-ts
# Then add it to tsconfig.base.json paths if needed
```
