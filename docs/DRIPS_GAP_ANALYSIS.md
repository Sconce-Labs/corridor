# Corridor vs the Drips Wave accepted cohort — gap analysis (2026-10-06)

**Question:** why were Sconce-Labs' repos rejected from the Stellar Drips Wave,
when 35 comparable repos were accepted? What must change before appealing?

**Method:** the 35 accepted repositories were pulled from the GitHub API
(metadata, community-health files, labels, open issues, READMEs) and compared
against the five Sconce-Labs Corridor repos. Program mechanics come from
docs.drips.network and the Stellar Wave page. Numbers below were captured
2026-10-06 and will drift; the *shape* of the gap is the finding.

---

## 1. How acceptance actually works (mechanics)

- The Stellar Wave Program lists **825 repos / 504 orgs / 9 waves to date**
  (monthly, $60–75k budget per wave). Being "accepted" = the Drips Wave GitHub
  App is installed on your org and the repo is **approved by the Wave
  organizers (SDF)** — applications are made from the Maintainers → Orgs and
  Repos dashboard.
- There is **no published rubric**. The docs only say applications "require
  approval from the Wave Program organizers", and that appeals are reconsidered
  only after "**substantive change — meaningful improvements to the code,
  project quality, activity, or the specific concerns raised in the review**".
- The reviewer-visible inputs at application time are: the repo's public
  README/code, its issue backlog (which becomes the Wave's work menu), its
  community-health files, its CI posture, and its activity/contributor
  footprint. Everything measurable in the cohort below is therefore a proxy
  for what SDF's reviewers actually looked at.
- Contributors are scored (OSS Activity Score, merged-PR percentiles, merge
  rate/latency) — that drives who works on issues, not whether a repo is
  listed. But a repo with few issues and no "good first issue" work offers a
  reviewer nothing to fund.

## 2. The accepted cohort (all 35, captured 2026-10-06)

| Repo | Stars | Forks | Open issues | Created | License | CoC | Contrib | PR-tpl |
|---|---|---|---|---|---|---|---|---|
| OFFER-HUB/offer-hub-monorepo | 54 | 323 | 26 | 2025-01 | none | – | – | – |
| ritik4ever/stellar-stream | 9 | 274 | **431** | 2026-02 | none | ✓ | ✓ | ✓ |
| Savitura/crowdpay | 3 | 205 | 17 | 2026-04 | MIT | – | – | – |
| karagozemin/OverSync | 11 | 96 | 9 | 2025-07 | MIT | – | – | – |
| accesslayerorg/accesslayer-client | 39 | 197 | 52 | 2026-03 | MIT | – | – | – |
| accesslayerorg/accesslayer-server | 44 | 196 | 57 | 2026-03 | MIT | – | – | – |
| BCPathway/bc-forge | 8 | 150 | 3 | 2026-04 | MIT | – | – | – |
| Stellar-Agent-Guard/…-contracts | 1 | 62 | 74 | 2026-09 | Apache-2.0 | – | – | – |
| StellarCanary/Protocol-Canary | 7 | 64 | 22 | 2026-09 | Apache-2.0 | ✓ | ✓ | ✓ |
| Wayfare-labs/wayfare | 4 | 86 | 49 | 2026-08 | Apache-2.0 | – | – | – |
| Emmy123222/Stellar-MarketPay- | 59 | 299 | 28 | 2026-03 | MIT | – | – | – |
| safetrustcr/frontend-SafeTrust | 28 | 142 | 27 | 2024-10 | none | – | – | – |
| use-assay/Assay | **0** | 51 | 27 | 2026-08 | Apache-2.0 | ✓ | ✓ | ✓ |
| zkpayroll/zk-payroll-contracts | 8 | 141 | 66 | 2026-02 | NOASSERTION | – | – | – |
| sorotrail/SoroTrail | 2 | 125 | 68 | 2026-07 | Apache-2.0 | – | – | – |
| Betta-Pay/BettaPay-Frontend | 4 | 135 | 61 | 2026-05 | none | – | – | – |
| Betta-Pay/BettaPay-Contract | 7 | 154 | 12 | 2026-05 | MIT | – | – | – |
| Stellar-Cost-Labs/soroban-cost-estimator | 5 | 90 | **146** | 2026-07 | Apache-2.0 | – | ✓ | – |
| LabsCrypt/flowfi | 18 | 250 | **174** | 2026-02 | none | – | – | – |
| ASTROIDX556/astroid-api | 1 | 76 | 69 | 2026-07 | MIT | – | – | – |
| accensa/x402-facilitator-stellar | 16 | 80 | 41 | 2026-08 | Apache-2.0 | – | – | – |
| Fortexa-stellar/Fortexa | 6 | 86 | 4 | 2026-04 | none | – | – | – |
| TevaLabs/Xelma-Blockchain | 6 | 112 | 78 | 2025-12 | MIT | – | – | – |
| edehvictor/StellarYield | 4 | 197 | 20 | 2026-03 | none | – | – | – |
| Query402/Query402 | 1 | 62 | 6 | 2026-04 | MIT | – | – | – |
| Emmy123222/Stellar-Search | 43 | 119 | 45 | 2026-04 | none | – | – | – |
| Jagadeeshftw/grainlify | 20 | **372** | 6 | 2025-12 | none | – | – | – |
| CemAyyildiz/Quittance | 5 | 90 | **0** | 2025-10 | MIT | – | – | – |
| TevaLabs/Xelma-Frontend | 6 | 136 | 72 | 2026-01 | none | – | – | – |
| Epta-Node/Linkora-social | 15 | 211 | 14 | 2026-04 | MIT | – | – | – |
| Fluxora-Org/Fluxora-Contracts | 5 | **474** | 26 | 2026-02 | none | – | – | – |
| akkuea/akkuea | 48 | 301 | 19 | 2025-02 | none | – | – | – |
| Stellar-Search/GreenPay | 9 | 75 | 108 | 2026-06 | MIT | – | – | – |
| Iris-IV/ProofOfHeart-frontend | 5 | 209 | **269** | 2026-03 | MIT | – | – | – |
| sorolens/sorolens | 10 | 99 | 3 | 2026-07 | Apache-2.0 | – | – | – |

**Corridor** (5 repos): stars 0–1, **forks 0–3**, open issues 3–11, created
2026-08/09, license Apache-2.0, CoC ✗, contributing ✗ (hub) / ✓ (contracts),
PR template ✗. Contributors: **1–2 per repo**.

## 3. What the accepted cohort has in common

1. **A large, visible contributor community — the dominant signal.** Forks run
   51–474 (median ≈ 135); several repos show 100+ contributors on page one of
   the contributors API. Almost all of it is Drips contributors themselves
   ("Fix. Merge. Earn."): a repo that is *already in the program* accretes
   hundreds of forks within weeks (Assay went 0 → 51 forks in ~2 months with
   **zero stars**; Protocol-Canary 0 → 64 in ~1 month). Corridor: 0–3 forks.
   This is as much **effect as cause** — but it means the reviewer saw a
   community-ready machine vs a solo project.
2. **An atomized, sprint-sized issue backlog.** Open issues: 431
   (stellar-stream), 269 (ProofOfHeart), 174 (flowfi), 146
   (soroban-cost-estimator), 108 (GreenPay), 74 (agent-guard), 68 (SoroTrail),
   66 (zk-payroll), 61–72 (BettaPay-FE, Xelma-FE, accesslayer-server)… The
   issues themselves are contributor-sized: "[TEST] Add repeatable verification
   for SQLite backup", "Add rustdoc for `is_empty` in canary-core (model.rs)"
   — Protocol-Canary files **one issue per function doc-comment**;
   soroban-cost-estimator files one issue per clippy-pedantic cleanup. The
   backlog *is* the product a Wave buys: no granular menu → nothing to
   allocate points against.
3. **"Stellar Wave" + complexity/trivial labels already applied** — i.e. the
   repos are wired into the program's label workflow, with `good first issue`
   and `trivial`/`medium`/`high` granularity.
4. **A wide issue surface beyond core features**: testing, CI/ops,
   observability, documentation, refactors, accessibility — cheap, parallel,
   low-risk entry points for strangers (and exactly what generates the 100+
   fork counts).
5. **Community-health files**: the organized repos carry Code of Conduct +
   CONTRIBUTING + PR templates (Protocol-Canary, Assay, stellar-stream). Not
   universal — but Corridor's hub repo has none of them.
6. **READMEs written for outsiders**: architecture diagrams, ADRs, quick-start,
   contribution pointers, badges (stellar-stream has 5 ADRs and FAQ/USE_CASES/
   DEPLOYMENT/RUNBOOK; Protocol-Canary has a docs site, releases + checksums).
7. **What does NOT differentiate**: stars (Assay has 0, Quittance 5), age
   (Protocol-Canary was created 2026-09-02 and accepted within ~a month),
   license (9 of 35 have none), size (Assay is 1.2 MB), or "is it a payments
   app" (the cohort is wildly heterogeneous: social, search, canary tooling,
   cost estimators, x402 facilitators, zk payroll — Corridor's zkKYC idea is
   *more* polished than most).
8. **Org strategy**: whole-org entries (Stellar-Agent-Guard, StellarCanary)
   were accepted with a small repo set and coordinated issues/CI across them.
   Multi-repo is fine — but each repo still needs the contributor-ready
   surface.

## 4. Root causes of Corridor's rejection, ranked

1. **No contributor-facing work surface.** 25 open issues across 5 repos, and
   the titles are roadmap epics ("Issuer CLI", "Operator console", "In-circuit
   ECIES", "Threat model doc"). Compare: 431 atomized issues one repo over.
   An SDF reviewer applying "can contributors earn points here for a week?"
   finds almost nothing to approve.
2. **No visible community and no external contribution history.** 1–2
   contributors, 0–3 forks, no merged PRs from strangers, no review activity.
   Every accepted repo shows (or quickly accretes) the opposite.
3. **Missing community-health layer on the hub**: no Code of Conduct, no
   issue templates, no PR template; CONTRIBUTING exists only in
   corridor-contracts. Cheap to fix, and it is part of the "project quality"
   language in the appeal policy.
4. **Discoverability/disclosure.** The Wave reviewer sees repo READMEs. The
   hub README is dense and internal-facing (HANDOFF/AUDIT jargon); the zkKYC
   value proposition and the "here's how a contributor touches this" story are
   buried in PROPOSAL.md and DRIPS.md.
5. **Not a code-quality problem.** Corridor's engineering depth (audited-core
   verifier, 54 host tests, CI, provenance docs) exceeds most of the cohort —
   the cohort's winners are not more rigorous, they are more *contributable*.
   The rejection reads as "not yet a community project", not "bad project".

## 5. Fix plan before appealing (appeal opens 2 weeks after rejection; max 3 appeals, 1-month cooldown between)

**Tier 1 — do all of it (the appeal's "substantive change" evidence):**
1. **Atomize the backlog from today's 25 open issues to ≥ 80–120 across the
   repos.** Break
   every epic into ≤ 1-day tasks with acceptance criteria in the body. Follow
   the cohort's pattern: rustdoc/natspec per module, one test per failure
   path, CI jobs per contract, docs per public function, `good first issue`
   on 20–30% of them, `trivial/medium/high` complexity labels (they already
   exist). Corridor's own docs (DRIPS_ISSUES.md map, AUDIT R2 findings,
   ROADMAP M4–M7) already contain the raw material — it needs surgery into
   issue-sized pieces.
2. **Add the community-health layer** to the hub + all repos: Code of
   Conduct, CONTRIBUTING (already drafted in corridor-contracts — generalize),
   issue templates (bug/feature/doc), PR template, SECURITY.md.
3. **Rewrite the hub README for outsiders**: what/why/who in the first
   screen, a diagram, quick-start per repo, "good first issue" pointer,
   links to PROPOSAL.md/AUDIT.md, badges (CI, license, test count).
4. **Seed external collaboration**: 3–5 small, well-formed PRs from outside
   the two core accounts (even documentation/nits from community members),
   plus fast, visible review turnaround. Fork/contributor counts move only
   when real people can land trivial wins.
5. **Label wiring**: ensure the exact labels Drips expects (`good first
   issue`, complexity levels) exist on every repo that will be applied, not
   just two.

**Tier 2 — strengthens the appeal:**
6. Per-repo landing pages: move DRIPS.md's repo table into each repo's README
   ("contributing to this repo"), link the Wave issue map.
7. Publish `docs/` anchors the reviewer can click: ARCHITECTURE diagram,
   demo GIF/script output of the testnet E2E (already exists — record it),
   the audit summary as a standalone page.
8. Engage before re-applying: show up in the Drips Discord, ask for the
   rejection's specific concerns in the appeal text, reference the concrete
   deltas (issue counts, community files, external PRs).

**What to say in the appeal:** lead with the delta, not the project: "since
rejection: issues 25 → N (atomized, contributor-sized, labeled), community
health files added to all 5 repos, README rewritten, X external PRs merged,
CI expanded, and the M3 real-ZK-verifier milestone shipped end-to-end
(audited core, on-chain proof verification on testnet)."

## 6. One-paragraph verdict

Corridor was not rejected for weak engineering — it was rejected for weak
**contributability**: no atomized issue menu, no community-health surface, no
visible contributor base, and READMEs written for insiders. The accepted
cohort is full of smaller, less rigorous codebases that nonetheless present a
reviewer with an immediately fundable machine: hundreds of labeled,
sprint-sized issues, contribution plumbing, and a fast-growing fork count from
contributors already earning in the program. Fix the surface (Tier 1), then
appeal with a quantified delta — the substance (audited verifier, real proofs
on-chain) is already ahead of most of the cohort.
