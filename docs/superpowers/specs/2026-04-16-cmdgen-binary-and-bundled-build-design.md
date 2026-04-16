# Cmdgen Binary and Bundled Build Design

## Summary

Make `bun install -g https://github.com/unstableneutron/cmdgen` prefer a
local-platform standalone binary while keeping `npm install -g` and other
non-Bun installation paths working through a bundled JavaScript fallback.
Differentiate the two outputs explicitly: a **binary** artifact and a
**script** artifact.

## Current State

- `package.json` exposes `bin.cmdgen = ./dist/cli.js`.
- `build:bun` produces a Node ESM script at `dist/cli.js`.
- `build:rolldown` provides a fallback path for the same JS artifact.
- Both current build variants externalize runtime package dependencies.
- There is no standalone binary output and no stable launcher that can prefer
  a binary while falling back to the script.

## Goals

- Make Bun-based source installs prefer a local-platform standalone binary.
- Keep a no-Bun install path working via Node and bundled JavaScript.
- Bundle runtime dependencies into the JS artifact instead of relying on
  package externals.
- Keep one stable installed command name: `cmdgen`.
- Make the distinction between binary and script outputs obvious in scripts,
  tests, and package metadata.

## Non-Goals

- Do not add a full cross-platform release matrix in this phase.
- Do not make GitHub/source installs universally portable across all
  operating systems and architectures when the package is built around a
  local-platform binary.
- Do not redesign CLI behavior or prompts.

## Chosen Approach

Adopt a dual-output package with a stable launcher:

1. Build a local-platform standalone binary when Bun is available.
2. Build a bundled JavaScript CLI artifact that includes runtime
   dependencies.
3. Publish a stable launcher as the package `bin` target.
4. Make the launcher prefer the binary when present and fall back to the
   bundled JS artifact otherwise.

This preserves a single public command path while allowing Bun-based installs
to benefit from a standalone binary and non-Bun installs to remain functional.

## Public Contract

### Installed command

- The package continues to expose one command: `cmdgen`.
- `package.json#bin.cmdgen` points to a stable launcher path, not directly to
  the binary and not directly to `dist/cli.js`.

### Preferred runtime behavior

- If a sibling standalone binary exists, the launcher executes it.
- Otherwise, the launcher executes the bundled JavaScript CLI under Node.

### Build terminology

- **Binary build**: produces the local-platform standalone executable.
- **Script build**: produces the bundled JavaScript CLI artifact.

The repo should use these terms consistently in scripts and tests so “build”
does not ambiguously refer to either artifact.

## Build Outputs and File Layout

- `src/cli.ts` — reusable CLI implementation.
- `src/bin.ts` — entrypoint used to build the bundled JS artifact.
- `src/launcher.ts` (or equivalent) — stable launcher source.
- `dist/cli.js` — bundled JavaScript fallback artifact.
- `dist/cmdgen` — Bun-compiled local-platform standalone binary.
- `dist/cmdgen.js` — stable installed launcher referenced by
  `package.json#bin`.

The stable launcher path allows package installation to remain valid even when
the binary is absent.

## Build Scripts and Lifecycle

### Bun-capable path

When Bun is available:

- `build:binary` creates `dist/cmdgen`.
- `build:script:bun` creates bundled `dist/cli.js` with runtime dependencies
  included.
- `build:launcher` creates `dist/cmdgen.js`.
- top-level `build` produces all required artifacts.

### No-Bun fallback path

When Bun is unavailable:

- skip `build:binary`
- use `build:script:rolldown` to create bundled `dist/cli.js`
- still create `dist/cmdgen.js`

This fallback path keeps `npm install -g` workable without requiring Bun while
preserving the same public `cmdgen` command.

### Package lifecycle hooks

- `prepare`, `prepack`, and `prepublishOnly` should invoke the top-level build
  contract.
- The build contract decides whether the binary is available based on Bun
  presence; package metadata remains stable either way.

## Bundling Strategy

### Bun script artifact

Remove the current `--packages=external` behavior from the Bun script build so
`dist/cli.js` contains bundled runtime dependencies needed by the CLI.

### Rolldown fallback artifact

Align the rolldown build with the same intent: produce a bundled fallback JS
artifact rather than relying on external runtime dependencies whenever
possible.

### Why bundle the JS artifact

Bundling the script artifact reduces install-path surprises and makes the
Node-based fallback closer to a self-contained runtime path. The binary still
remains the preferred path when present.

## Launcher Behavior

The stable launcher should:

1. Resolve sibling artifact paths relative to itself.
2. Check whether the local-platform binary exists and is executable.
3. Execute the binary when present.
4. Otherwise execute Node with `dist/cli.js`.
5. Propagate exit codes and stdio transparently.

The launcher should stay intentionally small and avoid re-implementing CLI
logic.

## Testing Strategy

Implementation should follow TDD.

Required coverage:

- `package.json` exposes the stable launcher path.
- build scripts clearly distinguish binary and script outputs.
- Bun build path produces launcher, bundled JS artifact, and binary.
- fallback build path produces launcher and bundled JS artifact without
  requiring the binary.
- the launcher prefers the binary when it exists.
- the launcher falls back to the bundled JS artifact when the binary is
  missing.
- packed artifacts include launcher and bundled JS artifact and may include the
  binary when built with Bun.
- source files such as `src/cli.ts` remain excluded from the packed runtime
  surface.

## Error Handling and Compatibility

- Binary absence is not an install failure when the JS fallback exists.
- Bun absence is not an install failure for Node-based package managers.
- The package may still be local-platform-specific when the binary path is the
  preferred Bun install experience; that is acceptable for this phase.
- The launcher must fail clearly if neither the binary nor the bundled JS
  artifact is present.

## Deferred Work

- Cross-platform binary build matrix.
- GitHub release automation for platform-specific binaries.
- Separate binary-only installation flows outside package-manager source
  installs.

## Implementation Notes

Likely touched areas:

- `package.json`
- `src/bin.ts`
- new launcher source file
- build scripts for Bun and rolldown
- packaging and entrypoint tests

The first implementation slice should establish the stable launcher contract
and dual build outputs before expanding into broader release automation.
