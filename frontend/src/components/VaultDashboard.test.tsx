import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import VaultDashboard from "./VaultDashboard";
import { VaultProvider } from "../context/VaultContext";
import { ToastProvider } from "../context/ToastContext";
import * as vaultApi from "../lib/vaultApi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("../lib/vaultApi", async (importOriginal) => {
  const actual = await importOriginal<typeof vaultApi>();
  return {
    ...actual,
    submitDeposit: vi.fn(),
  };
});

const mockSummary = {
  tvl: 12450800,
  apy: 8.45,
  participantCount: 1248,
  monthlyGrowthPct: 12.5,
  strategyStabilityPct: 99.9,
  assetLabel: "Sovereign Debt",
  exchangeRate: 1.084,
  networkFeeEstimate: "~0.00001 XLM",
  updatedAt: "2026-03-25T10:00:00.000Z",
  strategy: {
    id: "stellar-benji",
    name: "Franklin BENJI Connector",
    issuer: "Franklin Templeton",
    network: "Stellar",
    rpcUrl: "https://soroban-testnet.stellar.org",
    status: "active" as const,
    description:
      "Connector strategy that routes vault yield updates from BENJI-issued tokenized money market exposure on Stellar.",
  },
};

function renderDashboard(walletAddress: string | null, usdcBalance = 1250.5) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <VaultProvider>
          <VaultDashboard walletAddress={walletAddress} usdcBalance={usdcBalance} />
        </VaultProvider>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe("VaultDashboard", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (typeof url === "string" && url.includes("vault-history")) {
          return Promise.resolve(
            new Response(
              JSON.stringify([
                { date: "2025-09-24", value: 100 },
                { date: "2025-10-01", value: 100.32 },
              ]),
              {
                status: 200,
                headers: { "content-type": "application/json" },
              },
            ),
          );
        }
        return Promise.resolve(
          new Response(JSON.stringify(mockSummary), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
        );
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders the connect overlay when wallet is not connected", async () => {
    renderDashboard(null);

    expect(screen.getByText(/Wallet Not Connected/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Please connect your Freighter wallet/i),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/Franklin BENJI Connector/i),
    ).toBeInTheDocument();
  });

  it("renders the dashboard when wallet is connected", async () => {
    renderDashboard("GABC123");

    expect(screen.queryByText(/Wallet Not Connected/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Global RWA Yield Fund/i)).toBeInTheDocument();
    expect(screen.getByText(/Current APY/i)).toBeInTheDocument();

    expect(await screen.findByText(/Sovereign Debt/i)).toBeInTheDocument();
    expect(screen.getByText(/Strategy ID:/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Copy strategy ID/i })).toBeInTheDocument();
  });

  it("allows switching between deposit and withdraw tabs", async () => {
    renderDashboard("GABC123");

    expect(await screen.findByText(/Approve & Deposit/i)).toBeInTheDocument();

    const depositTab = screen.getByText("Deposit");
    const withdrawTab = screen.getByText("Withdraw");

    fireEvent.click(withdrawTab);
    expect(screen.getByText(/Amount to withdraw/i)).toBeInTheDocument();

    fireEvent.click(depositTab);
    expect(screen.getByText(/Amount to deposit/i)).toBeInTheDocument();
  });

  it("updates the amount input and processes a deposit", async () => {
    renderDashboard("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");

    expect(await screen.findByText(/Approve & Deposit/i)).toBeInTheDocument();

    const input = screen.getByPlaceholderText("0.00");
    fireEvent.change(input, { target: { value: "100" } });
    expect(input).toHaveValue(100);

    const button = screen.getByText("Approve & Deposit");
    fireEvent.click(button);

    await waitFor(
      () => {
        expect(screen.getByText(/100.00 USDC has been added/i)).toBeInTheDocument();
      },
      { timeout: 4000 },
    );

    expect(screen.getByText(/1350\.50/)).toBeInTheDocument();
  });

  it("fills the input with max allowable amount via MAX button", async () => {
    renderDashboard("GABC123");

    expect(await screen.findByText(/Approve & Deposit/i)).toBeInTheDocument();

    const maxButton = screen.getByRole("button", { name: "MAX" });
    fireEvent.click(maxButton);
    const input = screen.getByPlaceholderText("0.00");
    expect(input).toHaveValue(1250.5);

    fireEvent.click(screen.getByRole("button", { name: "Withdraw" }));
    fireEvent.click(maxButton);
    expect(input).toHaveValue(1250.5);
  });

  it("shows error banner when vault data fails to load", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );

    renderDashboard("GABC123");

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Failed to load vault data");
    }, { timeout: 3000 });
  });
});
