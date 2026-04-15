# Cmdgen Packaging Design

## Summary

Make `cmdgen` installable via standard `npm install -g` and `bun install -g`
without requiring Bun at runtime. Publish a conventional JavaScript CLI package
first. Defer standalone Bun-compiled executables to a later GitHub release
workflow.

## Current State

- `package.json` is marked `private: true`, so the package is not publishable.
- `bin.cmdgen` points at `bin/cmdgen`.
- `bin/cmdgen` is a Bash wrapper that runs `bun run --bun src/cli.ts`.
- The installed CLI therefore depends on Bun being present on the end user's
  machine.

## Goals

- Make the package publishable to npm.
- Make global `npm install` and `bun install` produce a working `cmdgen`
  command without Bun as a runtime dependency.
- Keep the user-facing CLI contract unchanged where practical.
- Preserve test coverage around the installed entrypoint behavior.

## Non-Goals

- Do not make npm or bun installs produce a single self-contained native
  executable in this phase.
- Do not add cross-platform GitHub release automation yet.
- Do not redesign the CLI UX.

## Chosen Approach

Use a standard published CLI package backed by built JavaScript:

1. Compile TypeScript source into a publishable `dist/` directory.
2. Point the package `bin` entry at a built JavaScript CLI entrypoint.
3. Ensure the built CLI runs under Node directly.
4. Treat Bun-compiled standalone binaries as a separate, future distribution
   path.

This keeps package installation predictable and compatible with normal npm/bun
ecosystems while leaving room for later native binary releases.

## Package Layout Changes

### Package metadata

- Remove `private: true`.
- Keep the package name if available on npm; otherwise switch to an available
  name or scope before publishing.
- Add standard publish-oriented metadata as needed (`files`, `scripts`, and
  optionally repository metadata).

### Build output

- Introduce a build step that emits JavaScript into `dist/`.
- The built CLI entrypoint should include a Node shebang so it can be executed
  as a normal package binary.
- Source files remain under `src/`; published runtime files come from `dist/`.

### Binary entrypoint

- Replace the current Bash wrapper install path with a `bin` entry that points
  at the built JavaScript file.
- Remove the Bun runtime dependency from the published command path.

## Runtime Expectations

After publication, this should work:

```sh
npm install -g cmdgen
cmdgen --help
```

and likewise for Bun-based installation, as a normal JS CLI package rather
than a standalone binary.

The installed command may still be a package-manager shim/launcher internally;
that is acceptable for this phase.

## Testing Strategy

Follow TDD for the implementation work.

Required coverage:

- The package entrypoint no longer shells out to Bun.
- The installed/published CLI path resolves to the built JS entrypoint.
- Existing command behaviors still work from the packaged entrypoint,
  especially `cmdgen init <shell>` and help output.

The current symlink-oriented wrapper test may need to be replaced or narrowed,
because the wrapper itself is no longer the main runtime path.

## Error Handling and Compatibility

- Prefer normal Node-based CLI execution so end users do not need Bun.
- Keep command-line behavior stable for existing users.
- If any dev-only Bun workflow remains, it must stay outside the published
  runtime path.

## Deferred Work

After this phase is stable, add a separate release-oriented script for building
standalone Bun executables and later wire that into GitHub releases.

## Implementation Notes

Likely touched areas:

- `package.json`
- `src/cli.ts` or a publish-specific entrypoint if needed
- tests covering the executable entrypoint
- new build output configuration/files if required

The first implementation slice should focus only on publishable package layout
and working npm/bun installation.
