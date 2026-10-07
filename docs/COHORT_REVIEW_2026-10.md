# Drips cohort review — 3 orgs, 19 additional accepted repos, and Corridor (2026-10-07)

**Question:** with the expanded accepted-repo playbook (35 repos reviewed 2026-10-06 +
the 19 added today), rate the three new orgs (Use-Tessera, Externalize-Labs,
SetOff-Org), review what they've done, assess their Drips acceptance outlook,
and identify what Corridor should still do before appealing and before
submitting the three orgs.

**Method:** all numbers pulled live from the GitHub API on 2026-10-07
(metadata, community-health profile, labels/templates, commit authors, file
trees, READMEs, workflows). The 2026-10-06 analysis of the original 35 accepted
repos is in [`DRIPS_GAP_ANALYSIS.md`](./DRIPS_GAP_ANALYSIS.md); this doc extends
it and does not repeat it.

---

## 1. The expanded accepted cohort (19 repos added today)

| Repo | Created | Lang | Stars | Forks | Open issues |
|---|---|---|---:|---:|---:|
| QuickLendX/quicklendx-protocol | 2025-07 | Rust | 11 | **526** | 13 |
| Fluxora-Org/Fluxora-Frontend | 2026-02 | TS | 3 | **400** | 39 |
| CalloraOrg/Callora-Contracts | 2026-02 | Rust | 2 | **335** | 67 |
| CredenceOrg/Credence-Frontend | 2026-02 | TS | 4 | **319** | 16 |
| ritik4ever/stellar-portfolio-rebalancer | 2025-08 | TS | 24 | **292** | 65 |
| CalloraOrg/Callora-Frontend | 2026-02 | TS | 4 | **291** | 39 |
| SoroLabs/soroscope | 2026-01 | Rust | 10 | **234** | 2 |
| accesslayerorg/accesslayer-contracts | 2026-03 | Rust | 45 | **194** | 53 |
| Nexacore-Org/NexaFx-backend | 2025-03 | TS | 3 | 176 | 19 |
| zkpayroll/zk-payroll-sdk | 2026-02 | TS | 7 | 159 | 32 |
| TevaLabs/Xelma-Backend | 2026-01 | TS | 4 | 155 | 88 |
| scout-off/scout-off-frontend | 2026-05 | TS | 7 | 158 | 132 |
| Betta-Pay/BettaPay-Backend | 2026-05 | TS | 5 | 150 | 9 |
| zkpayroll/zk-payroll-dashboard | 2026-02 | TS | 4 | 150 | 35 |
| CarbonScribe/carbon-scribe | 2025-12 | TS | 21 | 133 | 14 |
| TrusTrove/TrusTrove-contract | 2026-06 | Rust | 10 | 146 | 74 |
| soroventures/SoroMint | 2026-03 | JS | 13 | 102 | 75 |
| rinafcode/teachLink_contract | 2025-04 | Rust | 1 | 102 | 59 |
| Drago-Labs/golden-raccoon | 2026-06 | TS | 0 | 41 | 13 |

**Cohort median: ~155 forks, ~35 open issues.** Range: 41–526 forks, 2–132
issues. Combined with the 35 reviewed on 2026-10-06 (forks 51–474), the
playbook signal is unchanged and now measured across **54 accepted repos**:

1. **Fork count is the dominant visible differentiator** — it is contributor
   inflow from inside the program, it compounds, and no repo in either sample
   was accepted with single-digit forks.
2. **Issue count per listed repo: 2–132 (median ~35).** Even the low end
   (soroscope: 2, BettaPay-Backend: 9) got in — so the *floor* is low, but
   those repos compensate with everything else and often had prior waves'
   contributor history. Corridor at ~20 open issues/repo (79 across 4 repos) is
   mid-pack, no longer the outlier.
3. Acceptance does **not** track stars (0–45 in cohort), age (2 months to a
   year), language, or frontend-vs-contract focus.

## 2. The three orgs — what they've done

All three orgs were **created 2026-10-05 (within 10 minutes of each other)**,
all repos first-pushed 2026-10-06, all 262 commits authored by
**Samuel Ojetunde**, all at **v0.1.0** with identical scaffolding (CI + Release
+ Dependabot workflows, CoC/CONTRIBUTING/SECURITY/PR-template/issue-templates,
logos, org profile READMEs). They are brand-new, high-velocity, and clearly one
builder's portfolio.

### Use-Tessera — threshold signing for Stellar — **rating: 8/10 submission-ready**

| Repo | Lang | Commits | Test files | Docs | Health |
|---|---|---:|---:|---|---|
| `tessera` | Rust (203 KB) | 42 | 17 | security-model.md, CHANGELOG | 100% |
| `tessera-coordinator` | Go (83 KB) | 35 | n/a | — | 100% |

FROST (RFC 9591) threshold signing: any *t* of *n* parties produce one standard
Ed25519 signature — no contract, no visible multisig, with per-signer policy
enforcement against compromised coordinators/AI agents. **This is the
strongest of the three**: genuine cryptographic substance, an RFC to anchor
correctness claims to, a real protocol doc (`docs/security-model.md`), both a
library and an operational coordinator service, and full label/template
infrastructure already in place.

### Externalize-Labs — verify Stellar from validator signatures — **rating: 8/10 submission-ready**

| Repo | Lang | Commits | Test files | Docs | Health |
|---|---|---|---:|---|---|
| `externalize` | Rust (94 KB) | 39 | 22 | trust-model.md, bundle-format.md | 100% |
| `externalize-node` | Go (82 KB) | 34 | n/a | — | 100% |

SCP light-client proofs: wallets/indexers/bridges verify ledger data from the
validators' own signatures instead of trusting an RPC — offline, fail-closed,
browser-runnable. Distinct niche (nothing else in the 54-repo cohort does
light-client verification), good formal docs (trust model + bundle format),
most test files of the three orgs. Same solid scaffolding.

### SetOff-Org — multilateral netting for anchors — **rating: 6.5/10 — needs a week of work**

| Repo | Lang | Commits | Test files | Docs | Health |
|---|---|---|---:|---|---|
| `setoff-clearing` | Go (112 KB) | 39 | n/a | — | 100% |
| `setoff-engine` | Rust (39 KB) | 36 | 9 | algorithm.md, vectors.md | 100% |
| `setoff-contracts` | Rust (61 KB) | 37 | n/a | — | 100% |

Collect obligations in windows, settle only net positions; on-chain settlement
contract where a member's net debit must always be collateral-covered.
Deterministic netting engine with published algorithm + test vectors is the
right way to build this. **Gaps:** default-only labels (no `drips`,
`complexity`, `good first issue` taxonomy), **no issue templates** on
`setoff-engine` (siblings have bug.yml/task.yml), thinnest docs, three repos to
backfill instead of two.

### Acceptance outlook for the three orgs

As of today they would land where Corridor did: **everything except the
community signals** — 0 forks, 0 external contributors, 0 issues. The
scaffolding is *better* than corridor's was at rejection (health 100%, release
engineering, templates), but the Drips-visible gap is identical. The corridor
playbook applies directly and is cheap to execute (see §4).

**One strategic caution, stated plainly:** three orgs created minutes apart,
same sole author, applying to the same program, will read as wave-farming to a
reviewer unless the applications are honest about shared maintainership and
each org independently clears the contributability bar. Recommend: stagger the
submissions (strongest first — Tessera), disclose the shared builder, and make
sure each org has its own backlog + first external contributions before its
name goes in.

## 3. Corridor against the full 54-repo cohort

**Where Corridor now leads the entire cohort** (verified, not vibes):

1. **The only project with real ZK verification running on-chain.** Of 54
   repos, exactly one other (zkpayroll) touches ZK, and none runs a real
   proving system verifier in a Soroban contract. Corridor's UltraHonk
   verifier (vendored, OpenZeppelin-audited core) has granted and rejected
   passes in live testnet transactions — `PassGranted`, `NullifierUsed`,
   `ProofInvalid` — on **both** stacks since 2026-10-07.
2. **The only one with a public audit log that closes its critical finding.**
   AUDIT.md documents R2-C1 resolved with tx evidence. Nothing else in the
   cohort has any audit artifact.
3. **Sole project with a cryptographic-scheme conformance story** (circuit ⇄
   SDK ⇄ Soroban pinned Poseidon2/Schnorr vectors) and byte-identical
   reproduction of an upstream pinned VK.
4. **Community health 100% on all four repos** — top decile of the cohort.
5. Mid-pack backlog (79 issues / 31 gfi) after the atomization — no longer the
   rejection-era outlier of 25 total.

**Where Corridor still trails** (the same three numbers as the first analysis,
now measured against 54):

| Signal | Corridor | Cohort median |
|---|---|---|
| Forks (best repo) | 3 | ~150 |
| External merged contributors | 0 | most list 10+ |
| Stars (best repo) | 1 | ~4–10 |

These are **inflow numbers**: they move only when wave contributors arrive, or
slowly outside waves. They are also the numbers a reviewer can see at a glance,
which is why the appeal must lead with what changed, not with fork counts.

## 4. What to do before the appeal — and before submitting the three orgs

### Corridor (before appealing) — all cheap, all this week

1. ~~Atomize backlog~~ ✅ 79/31 done. ~~Community files~~ ✅ 100%×4.
   ~~Legacy mock stack~~ ✅ migrated 2026-10-07 (#28). ~~Link-graph hygiene~~ ✅ (#32).
2. **Pin the four repos on the org page** (UI-only; API cannot) — 2 minutes.
3. **Land #23 (demo video refresh) + #21 (mermaid sequence diagram)** — the
   two highest-visibility artifacts a reviewer opens after the README.
4. **Post 3–5 of the best `good first issue`s** in Stellar Discord
   (`#soroban`, `#drips`) and any wave contributor channels the moment the
   appeal window opens — issue *visibility* is what converts to forks.
5. **Re-run the gap-analysis numbers** (they are designed to be regenerated
   from the API) the day you file, and lead the appeal with the delta:
   *issues 25 → 79 with acceptance criteria, community health 100% ×4, real
   verifier live on both testnet stacks with tx evidence, audit critical
   resolved, mock verifier fully retired.*

### The three orgs (before each is submitted) — in order

1. **Copy corridor's label taxonomy** (`drips`, `complexity: low/medium/high`,
   `area: *`, `good first issue`) to all 7 repos — 30 minutes with a loop.
2. **Atomize each repo's backlog**: 15–25 scoped issues per repo from their own
   TODOs/roadmaps (`good first issue` on ~30%) — corridor's template works
   as-is. SetOff needs this most (also: port the bug/task issue templates from
   its siblings).
3. **Set org descriptions + websites** on all three (currently empty — Sconce
   has both; a reviewer sees the org page first).
4. **Stagger submissions**: Tessera first (8/10), Externalize next, SetOff
   last (after its gaps close). One per wave cycle if possible.
5. **Disclose shared maintainership** in each application; frame the three
   orgs (plus Sconce) as one builder's Stellar infrastructure portfolio —
   threshold signing, light-client verification, netting settlement, private
   eligibility. Honest framing converts "four applications, one person" from a
   red flag into a track record.
6. **Each org should land 1–2 small external PRs before its name goes in** —
   a single merged outside contribution is worth more than any README polish.

---

*All figures snapshot 2026-10-07 via the GitHub API; fork/issue counts drift.
Corridor's own numbers regenerate via the method in
[`DRIPS_GAP_ANALYSIS.md`](./DRIPS_GAP_ANALYSIS.md).*
