# v2.15.3 Release Tracking

This PR tracks the v2.15.3 release. All 5 commits are already on `main` (see git log
for `0a9aa17` through `dfa0d90`); this PR exists to:

1. Run the full **CI gate** (`ci.yml`: lint + type-check + 1317 tests + build) on a
   release branch.
2. Provide a **review surface** for the v2.15.3 changes.
3. Tag the merge commit as `v2.15.3` to trigger `release.yml` → `npm publish`.

## Commits in this release

| SHA | Type | Summary |
|---|---|---|
| `0a9aa17` | test | +206 unit tests, coverage 62.61% → 66.86% |
| `54f619b` | build | vite chunk split, dist 2.6MB → 715KB (-73%) |
| `05c5052` | feat | `BluetoothPrinter.writeRaw()` raw byte passthrough + 9 tests + examples end-to-end |
| `8c73b3d` | docs | v2.15.3 release notes + 5 new API docs |
| `dfa0d90` | chore | version bump 2.15.2 → 2.15.3 |

## Verification (already done locally)

- ✅ 1317 tests passed
- ✅ Coverage: 67.03% (lines)
- ✅ Build: 0 errors
- ✅ Type-check + Lint: 0 errors
- ✅ dist size: 2.6MB → 715KB (-73%)

## Post-merge

```bash
git checkout main
git pull origin main
git tag v2.15.3 dfa0d90
git push origin v2.15.3
# → release.yml auto-triggers → npm publish + GitHub Release
```
