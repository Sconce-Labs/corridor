## What

<!-- One or two sentences: what changed and why. Reference the issue:
     Closes #NNN -->

## How tested

<!-- CI runs the repo gates; note anything extra you ran (commands, fixtures,
     networks). If you did not run something, say so. -->

## Checklist

- [ ] Closes exactly one issue (one issue per PR)
- [ ] `cargo fmt` / `nargo fmt` / `prettier` (per repo) applied
- [ ] No trust-assumption change without updating `corridor/ARCHITECTURE.md` §6
      and the relevant docs
- [ ] Conventional commit title (`feat:`, `fix:`, `test:`, `docs:`, `chore:`)
