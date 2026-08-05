/**
 * soroban.ts — Phase 3 Soroban contract integration
 *
 * Read-only simulation helpers + signed transaction submission via Freighter.
 * All amounts are in human USDC units (e.g. 100.5); converted to i128 stroops
 * (7 decimal places) at the boundary.
 */
import {
  Contract,
  Networks,
  SorobanRpc,
  TransactionBuilder,
  BASE_FEE,
  nativeToScVal,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import { requestAccess, signTransaction } from "@stellar/freighter-api";
import { networkConfig } from "../config/network";

// Fee-source account used for read-only simulations (no funds needed)
const SIM_SOURCE =
  "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN";

const STROOP = 1e7; // Stellar uses 7 decimal places

function getServer(): SorobanRpc.Server {
  return new SorobanRpc.Server(networkConfig.rpcUrl, { allowHttp: false });
}

function getPassphrase(): string {
  return networkConfig.networkPassphrase || Networks.TESTNET;
}

export async function getConnectedAddress(): Promise<string> {
  const res = await requestAccess();
  if ("error" in res) throw new Error(res.error);
  return res.address;
}

// ── read helpers ─────────────────────────────────────────────────────────────

async function simulateView<T>(
  contractId: string,
  method: string,
  args: xdr.ScVal[] = [],
): Promise<T> {
  const server = getServer();
  const contract = new Contract(contractId);
  const account = await server.getAccount(SIM_SOURCE);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: getPassphrase(),
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulation failed [${method}]: ${sim.error}`);
  }
  const result = (sim as SorobanRpc.Api.SimulateTransactionSuccessResponse)
    .result;
  if (!result) throw new Error(`No result from ${method}`);
  return scValToNative(result.retval) as T;
}

export async function fetchOnChainTotalAssets(contractId: string): Promise<number> {
  if (!contractId) return 0;
  try {
    const raw = await simulateView<bigint>(contractId, "total_assets");
    return Number(raw) / STROOP;
  } catch {
    return 0;
  }
}

export async function fetchOnChainTotalShares(contractId: string): Promise<number> {
  if (!contractId) return 0;
  try {
    const raw = await simulateView<bigint>(contractId, "total_shares");
    return Number(raw) / STROOP;
  } catch {
    return 0;
  }
}

export async function fetchOnChainSharePrice(contractId: string): Promise<number> {
  if (!contractId) return 1.0;
  try {
    const raw = await simulateView<bigint>(contractId, "share_price");
    return Number(raw) / STROOP;
  } catch {
    return 1.0;
  }
}

export async function fetchOnChainUserBalance(
  contractId: string,
  userAddress: string,
): Promise<number> {
  if (!contractId || !userAddress) return 0;
  try {
    const arg = nativeToScVal(userAddress, { type: "address" });
    const raw = await simulateView<bigint>(contractId, "balance", [arg]);
    return Number(raw) / STROOP;
  } catch {
    return 0;
  }
}

// ── write helpers ─────────────────────────────────────────────────────────────

function amountToScVal(amount: number): xdr.ScVal {
  return nativeToScVal(BigInt(Math.round(amount * STROOP)), { type: "i128" });
}

async function invokeContract(
  contractId: string,
  method: string,
  args: xdr.ScVal[],
  signerAddress: string,
): Promise<string> {
  const server = getServer();
  const contract = new Contract(contractId);
  const account = await server.getAccount(signerAddress);

  const builtTx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: getPassphrase(),
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(builtTx);
  if (SorobanRpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulation failed [${method}]: ${sim.error}`);
  }

  const preparedTx = SorobanRpc.assembleTransaction(builtTx, sim).build();

  const signResult = await signTransaction(preparedTx.toXDR(), {
    networkPassphrase: getPassphrase(),
  });
  if ("error" in signResult) throw new Error(signResult.error);

  const signedTx = TransactionBuilder.fromXDR(
    signResult.signedTxXdr,
    getPassphrase(),
  );
  const submitRes = await server.sendTransaction(signedTx);

  if (submitRes.status === "ERROR") {
    throw new Error(`Submit failed: ${JSON.stringify(submitRes.errorResult)}`);
  }

  const hash = submitRes.hash;
  for (let i = 0; i < 24; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const getRes = await server.getTransaction(hash);
    if (getRes.status === "SUCCESS") return hash;
    if (getRes.status === "FAILED")
      throw new Error(`Transaction failed on-chain: ${hash}`);
  }
  throw new Error(`Transaction ${hash} not confirmed after 36s`);
}

export async function depositToVault(
  contractId: string,
  signerAddress: string,
  usdcAmount: number,
): Promise<string> {
  return invokeContract(
    contractId,
    "deposit",
    [
      nativeToScVal(signerAddress, { type: "address" }),
      amountToScVal(usdcAmount),
    ],
    signerAddress,
  );
}

export async function withdrawFromVault(
  contractId: string,
  signerAddress: string,
  shares: number,
): Promise<string> {
  return invokeContract(
    contractId,
    "withdraw",
    [
      nativeToScVal(signerAddress, { type: "address" }),
      amountToScVal(shares),
    ],
    signerAddress,
  );
}
