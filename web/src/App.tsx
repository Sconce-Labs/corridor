import { useEffect, useState, type FormEvent } from "react";
import { Logo } from "./Logo";
import {
  CONTRACTS,
  DEMO_CORRIDOR_ID,
  LINKS,
  NETWORK,
  stellarExpert,
} from "./config";
import {
  getPolicy,
  isCleared,
  normalizeHex32,
  passes,
  passRecord,
  shortAddr,
  type CorridorPolicy,
  type PassRecord,
} from "./corridor";

export function App() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <HowItWorks />
        <LiveOnTestnet />
        <ClearanceChecker />
        <Privacy />
      </main>
      <Footer />
    </>
  );
}

function Header() {
  return (
    <header className="site-header">
      <div className="wrap">
        <a className="brand" href="#top">
          <Logo />
          Corridor
        </a>
        <nav className="nav">
          <a href="#how" className="hide-sm">
            How it works
          </a>
          <a href="#live" className="hide-sm">
            Live
          </a>
          <a href="#check">Check clearance</a>
          <a className="ghbtn" href={LINKS.hub}>
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="hero" id="top">
      <div className="wrap">
        <div className="eyebrow">Stellar-native · zero-knowledge</div>
        <h1>Portable proof of eligibility for cross-border payments</h1>
        <p className="lead">
          Do KYC once with a regulated issuer. Then prove you are cleared to any
          payment corridor — without re-uploading documents and without
          revealing who you are. The corridor sees a valid pass; it never sees
          you.
        </p>
        <div className="cta-row">
          <a className="btn btn-primary" href="#how">
            How it works
          </a>
          <a className="btn btn-ghost" href={LINKS.architecture}>
            Architecture ↗
          </a>
          <a className="btn btn-ghost" href={LINKS.drips}>
            Build with us — Drips Wave ↗
          </a>
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  {
    h: "Issuer signs",
    p: "A licensed issuer runs KYC once, then signs a short-lived statement — {tier, expiry, epoch} — with a Grumpkin key. Nothing per-person is written to a chain.",
  },
  {
    h: "Holder proves",
    p: "On their own device, the holder generates a Noir → UltraHonk proof: they hold a valid issuer signature meeting this corridor's policy, plus a per-corridor nullifier.",
  },
  {
    h: "Stellar attests",
    p: "corridor_attestation.enter() binds the proof to the on-chain policy, calls the policy's verifier, burns the nullifier once, and records a pass. The policy binding is live on testnet; the UltraHonk verifier is a mock until milestone M3.",
  },
  {
    h: "Payout gates",
    p: "The corridor operator's payout contract calls is_cleared(corridor_id, nullifier) and releases funds. Zero coupling, zero identity data.",
  },
];

function HowItWorks() {
  return (
    <section className="band" id="how">
      <div className="wrap">
        <h2>How it works</h2>
        <p className="sub">
          There is no shared ledger of credentials and no cross-chain bridge to
          trust. Eligibility is an issuer signature the holder proves knowledge
          of in zero knowledge. Revocation is short expiry plus a monotonic
          epoch floor.{" "}
          <a href={LINKS.accumulator}>Why the earlier design was dropped ↗</a>
        </p>
        <div className="steps">
          {STEPS.map((s) => (
            <div className="step" key={s.h}>
              <div className="n" />
              <h3>{s.h}</h3>
              <p>{s.p}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

type Load<T> = { state: "loading" } | { state: "ok"; data: T } | { state: "err"; msg: string };

function LiveOnTestnet() {
  const [policy, setPolicy] = useState<Load<CorridorPolicy>>({ state: "loading" });
  const [count, setCount] = useState<Load<bigint>>({ state: "loading" });

  useEffect(() => {
    let alive = true;
    getPolicy(DEMO_CORRIDOR_ID)
      .then((d) => alive && setPolicy({ state: "ok", data: d }))
      .catch((e) => alive && setPolicy({ state: "err", msg: String(e.message ?? e) }));
    passes(DEMO_CORRIDOR_ID)
      .then((d) => alive && setCount({ state: "ok", data: d }))
      .catch((e) => alive && setCount({ state: "err", msg: String(e.message ?? e) }));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section className="band" id="live">
      <div className="wrap">
        <h2>Live on Stellar testnet</h2>
        <p className="sub">
          The attestation stack is deployed and the{" "}
          <code>register → enter → is_cleared</code> flow runs on-chain. Proof
          verification is a mock today — the real UltraHonk verifier is milestone
          M3. Read straight from {NETWORK.rpcUrl.replace("https://", "")}.
        </p>

        <div className="grid-2">
          <div className="card">
            <h3>Contracts</h3>
            <div className="addr-list">
              <AddrRow label="corridor_registry" id={CONTRACTS.registry} />
              <AddrRow label="corridor_attestation" id={CONTRACTS.attestation} />
              <AddrRow
                label="verifier_mock (M3 placeholder)"
                id={CONTRACTS.verifierMock}
              />
            </div>
            <p className="muted" style={{ marginTop: 14 }}>
              Full record:{" "}
              <a href={LINKS.deployment}>deployments/testnet.json ↗</a>
            </p>
          </div>

          <div className="card">
            <h3>Demo corridor #4</h3>
            {policy.state === "loading" && (
              <p className="muted">
                <span className="spin" /> reading policy…
              </p>
            )}
            {policy.state === "err" && (
              <p className="notice">Couldn’t read the policy: {policy.msg}</p>
            )}
            {policy.state === "ok" && (
              <dl className="kv">
                <dt>min tier</dt>
                <dd>{policy.data.minTier}</dd>
                <dt>epoch floor</dt>
                <dd>{policy.data.minCredEpoch.toString()}</dd>
                <dt>accepted issuers</dt>
                <dd>{policy.data.acceptedIssuers.length}</dd>
                <dt>auditor</dt>
                <dd>
                  {/^0x0*$/.test(policy.data.auditorPubkey) ? "none" : "set"}
                </dd>
                <dt>status</dt>
                <dd>
                  <span className={"pill " + (policy.data.paused ? "no" : "ok")}>
                    {policy.data.paused ? "paused" : "open"}
                  </span>
                </dd>
              </dl>
            )}
            <hr
              style={{
                border: 0,
                borderTop: "1px solid var(--border)",
                margin: "16px 0",
              }}
            />
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <span className="big-num">
                {count.state === "ok"
                  ? count.data.toString()
                  : count.state === "loading"
                    ? "—"
                    : "?"}
              </span>
              <span className="muted">passes granted</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AddrRow({ label, id }: { label: string; id: string }) {
  return (
    <a className="addr" href={stellarExpert(id)} title={id}>
      <span className="label">{label}</span>
      <code>{shortAddr(id, 6)}</code>
    </a>
  );
}

function ClearanceChecker() {
  const [corridor, setCorridor] = useState(DEMO_CORRIDOR_ID);
  const [nullifier, setNullifier] = useState("");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<
    | null
    | { kind: "ok"; cleared: boolean; record: PassRecord | null }
    | { kind: "err"; msg: string }
  >(null);

  async function run(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setOut(null);
    try {
      const cid = normalizeHex32(corridor);
      const nul = normalizeHex32(nullifier);
      const cleared = await isCleared(cid, nul);
      const record = cleared ? await passRecord(cid, nul).catch(() => null) : null;
      setOut({ kind: "ok", cleared, record });
    } catch (err) {
      setOut({ kind: "err", msg: String((err as Error).message ?? err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="band" id="check">
      <div className="wrap">
        <h2>Check a clearance</h2>
        <p className="sub">
          The exact call a corridor operator makes before releasing funds:{" "}
          <code>corridor_attestation.is_cleared(corridor_id, nullifier)</code>.
          Read-only, no wallet. Try the pre-filled demo values.
        </p>

        <div className="grid-2">
          <form className="card checker" onSubmit={run}>
            <label htmlFor="cid">corridor_id (32-byte hex)</label>
            <input
              id="cid"
              value={corridor}
              spellCheck={false}
              onChange={(e) => setCorridor(e.target.value)}
            />
            <label htmlFor="nul">nullifier (32-byte hex)</label>
            <input
              id="nul"
              value={nullifier}
              spellCheck={false}
              placeholder="0x3333…3333"
              onChange={(e) => setNullifier(e.target.value)}
            />
            <button className="btn btn-primary" disabled={busy} type="submit">
              {busy ? (
                <>
                  <span className="spin" /> checking…
                </>
              ) : (
                "is_cleared?"
              )}
            </button>

            {out?.kind === "ok" && (
              <div className={"result " + (out.cleared ? "ok" : "no")}>
                <strong>
                  {out.cleared ? "✓ cleared" : "✗ not cleared"}
                </strong>
                {out.cleared && out.record && (
                  <div className="muted" style={{ marginTop: 6 }}>
                    tag {out.record.tag} · ledger {out.record.ledger} · granted{" "}
                    {new Date(
                      Number(out.record.timestamp) * 1000,
                    ).toLocaleString()}
                  </div>
                )}
                {out.cleared && !out.record && (
                  <div className="muted" style={{ marginTop: 6 }}>
                    pass record present
                  </div>
                )}
              </div>
            )}
            {out?.kind === "err" && (
              <div className="result err">
                <strong>Couldn’t check</strong>
                <div className="muted" style={{ marginTop: 6 }}>
                  {out.msg}
                </div>
              </div>
            )}
          </form>

          <div className="card">
            <h3>What this proves</h3>
            <p className="muted">
              A <code>true</code> means a proof was presented for this corridor
              and that nullifier was burned, with the policy binding enforced
              on-chain — accepted issuer, minimum tier, revocation floor, auditor
              key, time-skew window.
            </p>
            <p className="notice">
              On testnet the ZK proof itself is checked by a <em>mock</em>
              verifier (milestone M3). So `true` here attests the policy binding
              and one-time use — not yet the cryptographic proof.
            </p>
            <p className="muted">
              It does <em>not</em> reveal who. The nullifier is{" "}
              <code>Poseidon2(holder_secret, corridor_id)</code> — the same
              holder gets a different, unlinkable nullifier on every other
              corridor.
            </p>
            <p className="muted">
              Operators should still gate on-chain (a cross-contract call), not
              only on a value read from an RPC they don’t control.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

const OBSERVERS = [
  {
    who: "A Stellar observer",
    sees: "A pass was granted on corridor C, a tag index, an aggregate counter, a burned nullifier. Proofs arrive via a fee-sponsoring relayer, so not the holder's account.",
  },
  {
    who: "A Midnight observer",
    sees: "The set of licensed issuers and each issuer's current credential epoch. Nothing per-credential, nothing per-holder.",
  },
  {
    who: "Nobody, on either chain",
    sees: "The holder's identity, documents, tier, expiry, the issuer↔holder link, or the holder's activity across corridors.",
  },
  {
    who: "A warranted auditor (planned — M7)",
    sees: "Only {tier, issuer} for the specific passes named in their warrant. The auditor blob is a commitment today; decryption to the auditor key is milestone M7.",
  },
];

function Privacy() {
  return (
    <section className="band" id="privacy">
      <div className="wrap">
        <h2>Who sees what</h2>
        <p className="sub">
          Privacy is the point. The design is built so that each party learns
          exactly what they need and nothing more.
        </p>
        <div className="obs">
          {OBSERVERS.map((o) => (
            <div className="row" key={o.who}>
              <div className="who">{o.who}</div>
              <div>{o.sees}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="cols">
          <div>
            <h4>Repositories</h4>
            <ul>
              <li>
                <a href={LINKS.hub}>corridor</a> — hub + Midnight registry
              </li>
              <li>
                <a href={LINKS.contracts}>corridor-contracts</a> — Soroban
              </li>
              <li>
                <a href={LINKS.circuits}>corridor-circuits</a> — Noir
              </li>
              <li>
                <a href={LINKS.sdk}>corridor-sdk</a> — @corridor/verify
              </li>
            </ul>
          </div>
          <div>
            <h4>Docs</h4>
            <ul>
              <li>
                <a href={LINKS.architecture}>Architecture</a>
              </li>
              <li>
                <a href={LINKS.accumulator}>Design decision (Option B)</a>
              </li>
              <li>
                <a href={LINKS.deployment}>Testnet deployment</a>
              </li>
            </ul>
          </div>
          <div>
            <h4>Contribute</h4>
            <ul>
              <li>
                <a href={LINKS.drips}>Stellar Drips Wave</a>
              </li>
              <li>
                <a href={LINKS.org}>Sconce Labs</a>
              </li>
            </ul>
          </div>
        </div>
        <div className="foot-bottom">
          <span className="muted">
            Pre-MVP research build · Apache-2.0 · not audited · testnet only
          </span>
          <span className="built">
            Built with <span className="heart">love</span> for Stellar
          </span>
        </div>
      </div>
    </footer>
  );
}
