# boringcache/elixir-action

**Cache once. Reuse everywhere.**

Setup Elixir + Erlang via mise and cache deps + build artifacts with BoringCache.

## Quick start

```yaml
- uses: boringcache/elixir-action@v1
  with:
    workspace: my-org/my-project
    elixir-version: '1.17'
    erlang-version: '27'
  env:
    BORINGCACHE_API_TOKEN: ${{ secrets.BORINGCACHE_API_TOKEN }}

- run: mix deps.get && mix compile
```

## How it works

1. **Main step**: Installs Erlang/OTP and Elixir via mise (with cached installations), then restores `deps/` and `_build/` directories from BoringCache.
2. **Build**: Run your mix commands as usual. Cached deps and compiled artifacts are already in place.
3. **Post step**: Saves the mise installation, `deps/`, and `_build/` back to BoringCache.

## Version detection

Versions are auto-detected from project files:

| Priority | Elixir source | Erlang source |
|----------|--------------|--------------|
| 1 | `elixir-version` input | `erlang-version` input |
| 2 | `.elixir-version` file | `.tool-versions` file |
| 3 | `.tool-versions` file | Fallback: `27` |
| 4 | `mix.exs` (`elixir: "~> X.Y"`) | |
| 5 | Fallback: `1.18` | |

## What gets cached

| Cache | Tag pattern | Description |
|-------|-----------|-------------|
| Runtime | `{prefix}-elixir-{version}-otp-{otp}` | Erlang + Elixir installation (mise data dir) |
| Dependencies | `{prefix}-elixir-deps` | `deps/` directory (Hex packages) |
| Build | `{prefix}-elixir-build-{version}-otp-{otp}` | `_build/` directory (compiled BEAM files) |

The runtime cache is version-specific (Elixir + OTP combo). Dependencies are shared across versions. Build cache is version-specific since compiled BEAM files are tied to the OTP version.

## Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `cli-version` | `v1.10.2` | BoringCache CLI version. Set to `skip` to disable automatic setup. |
| `workspace` | | BoringCache workspace (e.g., `my-org/my-project`). |
| `cache-tag` | repo name | Cache tag prefix. |
| `elixir-version` | `1.18` | Elixir version. Auto-detected from `.tool-versions` or `mix.exs`. |
| `erlang-version` | `27` | Erlang/OTP version. Auto-detected from `.tool-versions`. |
| `working-directory` | `.` | Working directory for the project. |
| `cache-elixir` | `true` | Cache Elixir + Erlang installation from mise. |
| `cache-deps` | `true` | Cache Mix `deps/` directory. |
| `cache-build` | `true` | Cache Mix `_build/` directory. |
| `verbose` | `false` | Enable verbose CLI output. |
| `exclude` | | Glob pattern to exclude files from cache digest. |
| `save-always` | `false` | Save cache even if the job fails. |

## Outputs

| Output | Description |
|--------|-------------|
| `workspace` | Resolved workspace name. |
| `elixir-version` | Installed Elixir version. |
| `erlang-version` | Installed Erlang/OTP version. |
| `cache-tag` | Cache tag prefix used. |
| `cache-hit` | Whether any cache was restored. |
| `elixir-cache-hit` | Whether the runtime installation cache was restored. |
