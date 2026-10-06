# Security Policy

## Scope

This hub repo holds the product proposal, architecture, roadmap, audit log and
the web frontend. The security-sensitive surfaces live in the sibling repos:

- **[corridor-contracts](https://github.com/Sconce-Labs/corridor-contracts)** —
  Soroban contracts and the UltraHonk verifier (fail-closed, `vk_hash`-pinned)
- **[corridor-circuits](https://github.com/Sconce-Labs/corridor-circuits)** —
  the Noir eligibility circuit
- **[corridor-sdk](https://github.com/Sconce-Labs/corridor-sdk)** — holder-side
  witness building and signing (private inputs never leave the device)

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Use GitHub's private vulnerability reporting (**Security → Report a
vulnerability**) on the repository the finding touches — or on this repo if you
are unsure. Include a description, reproduction steps, and your assessment of
impact.

Especially valuable areas: the verifier's fail-closed guarantees, nullifier
uniqueness/linkage, policy binding (`verifier` + `vk_hash`) enforcement in
`enter()`, canonical public-input decoding, and SDK secret handling.

We will acknowledge reports within 7 days and aim to ship a fix within 90 days.
We credit reporters in the release notes unless you prefer anonymity.
