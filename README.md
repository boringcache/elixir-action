# boringcache/elixir-action

Set up Elixir and Erlang via mise and cache deps plus build artifacts with BoringCache.

## Quick start

```yaml
- uses: boringcache/elixir-action@v1
  with:
    workspace: my-org/my-project
    elixir-version: "1.17"
    erlang-version: "27"
  env:
    BORINGCACHE_RESTORE_TOKEN: ${{ secrets.BORINGCACHE_RESTORE_TOKEN }}
    BORINGCACHE_SAVE_TOKEN: ${{ github.event_name == 'pull_request' && '' || secrets.BORINGCACHE_SAVE_TOKEN }}

- run: mix deps.get && mix compile
```

## What it caches

- Elixir and Erlang from `.tool-versions`, `.elixir-version`, or `mix.exs`.
- The Elixir/Erlang installation under mise.
- `deps/`.
- `_build/`.

## Key inputs

| Input | Description |
|-------|-------------|
| `workspace` | Workspace in `org/repo` form. |
| `elixir-version` | Override the detected Elixir version. |
| `erlang-version` | Override the detected Erlang version. |
| `cache-elixir` | Cache the Elixir/Erlang installation from mise. |
| `cache-deps` | Cache `deps/`. |
| `cache-build` | Cache `_build/`. |
| `working-directory` | Project directory to inspect. |
| `save-always` | Save even if the job fails. |

## Outputs

| Output | Description |
|--------|-------------|
| `elixir-version` | Installed Elixir version. |
| `erlang-version` | Installed Erlang version. |
| `cache-hit` | Whether any cache was restored. |
| `elixir-cache-hit` | Whether the runtime cache was restored. |
| `workspace` | Resolved workspace name. |

## Docs

- [Language actions docs](https://boringcache.com/docs#language-actions)
- [GitHub Actions auth and trust model](https://boringcache.com/docs#actions-auth)
