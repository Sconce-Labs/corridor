/**
 * In-memory simulator for the Corridor counter contract.
 *
 * Executes the contract's circuits directly against a CircuitContext — no
 * chain, no proof server, no wallet. This lets the unit tests exercise the
 * circuit logic, state transitions, and privacy guarantees deterministically.
 */
import {
  type CircuitContext,
  sampleContractAddress,
  createConstructorContext,
  createCircuitContext,
} from '@midnight-ntwrk/compact-runtime';
import {
  Contract,
  type Ledger,
  ledger,
} from '../contracts/managed/counter/contract/index.js';
import { type CounterPrivateState, witnesses } from '../src/witnesses.js';

export class CounterSimulator {
  readonly contract: Contract<CounterPrivateState>;
  circuitContext: CircuitContext<CounterPrivateState>;

  constructor() {
    this.contract = new Contract<CounterPrivateState>(witnesses);
    const {
      currentPrivateState,
      currentContractState,
      currentZswapLocalState,
    } = this.contract.initialState(
      createConstructorContext({}, '0'.repeat(64)),
    );
    this.circuitContext = createCircuitContext(
      sampleContractAddress(),
      currentZswapLocalState,
      currentContractState,
      currentPrivateState,
    );
  }

  /** The public ledger state as currently simulated. */
  public getLedger(): Ledger {
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  /**
   * Execute the `enterCorridor` circuit: assert a positive private
   * entitlement, increment the public counter by 1, and disclose the tag.
   * Returns the ledger state after the transition.
   */
  public enterCorridor(entitlement: bigint, entryTag: string): Ledger {
    this.circuitContext = this.contract.impureCircuits.enterCorridor(
      this.circuitContext,
      entitlement,
      entryTag,
    ).context;
    return ledger(this.circuitContext.currentQueryContext.state);
  }
}
