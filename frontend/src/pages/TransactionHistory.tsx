import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import ApiStatusBanner from "../components/ApiStatusBanner";
import { DataTable, type DataTableColumn } from "../components/DataTable";
import { useDataTableState } from "../hooks/useDataTableState";
import { useClientDataTable } from "../hooks/useClientDataTable";
import { normalizeApiError, type ApiError } from "../lib/api";
import {
  getTransactions,
  formatAmount,
  formatTimestamp,
  truncateHash,
  type Transaction,
} from "../lib/transactionApi";
import CopyButton from "../components/CopyButton";
import ViewState from "../components/ViewState";
import RefreshControl from "../components/RefreshControl";

interface TransactionHistoryProps {
  walletAddress: string | null;
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  walletAddress,
}) => {
  const [searchParams] = useSearchParams();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const tableState = useDataTableState({
    defaultSearch: searchParams.get("search") || "",
    defaultSortBy: "timestamp",
    defaultSortDirection: "desc",
    defaultPage: Number(searchParams.get("page")) || 1,
    defaultPageSize: 10,
  });

  const fetchTransactions = async (silent = false) => {
    if (!walletAddress) return;

    if (!silent) setIsLoading(true);
    setError(null);

    try {
      const data = await getTransactions({
        walletAddress,
        limit: 50,
        order: "desc",
        type: "all",
      });
      setTransactions(data);
      setLastRefreshed(new Date());
    } catch (err: any) {
      setError(normalizeApiError(err));
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress]);

  const columns: DataTableColumn<Transaction>[] = [
    {
      id: "type",
      header: "Type",
      sortable: true,
      cell: (tr: Transaction) => (
        <span
          className="tag"
          style={{
            textTransform: "capitalize",
            background:
              tr.type === "deposit"
                ? "rgba(16, 185, 129, 0.1)"
                : "rgba(99, 102, 241, 0.1)",
            color:
              tr.type === "deposit"
                ? "var(--accent-cyan)"
                : "var(--accent-purple)",
            border: "1px solid currentColor",
          }}
        >
          {tr.type}
        </span>
      ),
    },
    {
      id: "amount",
      header: "Amount",
      sortable: true,
      cell: (tr: Transaction) => (
        <span style={{ fontWeight: 600, fontFamily: "var(--font-display)" }}>
          {formatAmount(tr.amount, tr.asset)}
        </span>
      ),
    },
    {
      id: "timestamp",
      header: "Date",
      sortable: true,
      cell: (tr: Transaction) => (
        <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          {formatTimestamp(tr.timestamp)}
        </span>
      ),
    },
    {
      id: "hash",
      header: "Hash",
      sortable: false,
      cell: (tr: Transaction) => (
        <div className="copy-field">
          <span className="copy-field-value copy-field-value-mono">
            {truncateHash(tr.transactionHash)}
          </span>
          <CopyButton
            value={tr.transactionHash}
            label="transaction hash"
            successDescription="Hash copied to clipboard"
          />
        </div>
      ),
    },
  ];

  const { rows, totalItems, totalPages } = useClientDataTable<Transaction>({
    rows: transactions,
    state: tableState.state,
    getSearchValue: (row) =>
      `${row.type} ${row.asset} ${row.transactionHash}`,
    getSortValue: (row, columnId) => {
      switch (columnId) {
        case "type":
          return row.type;
        case "amount":
          return row.amount ?? "0";
        case "timestamp":
          return new Date(row.timestamp).getTime();
        default:
          return row.amount ?? "0";
      }
    },
  });

  if (!isLoading && transactions.length === 0 && !error) {
    return (
      <ViewState
        title="No transactions found"
        description="Your deposit and withdrawal history will appear here once you start using the YieldVault."
      />
    );
  }

  return (
    <div className="container" style={{ padding: "40px 0" }}>
      {error && <ApiStatusBanner error={error} />}
      <div
        className="flex justify-between items-end"
        style={{ marginBottom: "32px" }}
      >
        <div>
          <h1 style={{ marginBottom: "8px" }}>Transaction History</h1>
          <p style={{ color: "var(--text-secondary)" }}>
            View all your vault activity and on-chain settlements.
          </p>
        </div>
        <div className="flex gap-md items-center">
           <RefreshControl
            isPolling={false}
            isPaused={true}
            pauseReason="manual"
            onPause={() => {}}
            onResume={() => fetchTransactions()}
            onRefresh={() => fetchTransactions(true)}
            isRefetching={isLoading}
            lastUpdated={lastRefreshed}
          />
        </div>
      </div>

      <div className="glass-panel" style={{ padding: "0" }}>
        <DataTable<Transaction>
          columns={columns}
          rows={rows}
          isLoading={isLoading}
          rowKey={(row) => row.id}
          caption="Transaction History"
          emptyMessage="No transactions found"
          sortBy={tableState.state.sortBy}
          sortDirection={tableState.state.sortDirection}
          onSortChange={tableState.setSort}
          pagination={{
            page: tableState.state.page,
            pageSize: tableState.state.pageSize,
            totalItems,
            totalPages,
          }}
          onPageChange={tableState.setPage}
          onPageSizeChange={tableState.setPageSize}
        />
      </div>
    </div>
  );
};

export default TransactionHistory;
