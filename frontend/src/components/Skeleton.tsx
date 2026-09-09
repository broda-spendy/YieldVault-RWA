import React from "react";

interface SkeletonProps {
  variant?: "text" | "circular" | "rectangular" | "card" | "stat" | "chart";
  width?: string | number;
  height?: string | number;
  className?: string;
  animation?: "pulse" | "wave" | "none";
}

const Skeleton: React.FC<SkeletonProps> = ({
  variant = "text",
  width = "100%",
  height,
  className = "",
  animation = "pulse",
}) => {
  const baseStyles: React.CSSProperties = {
    background: "linear-gradient(90deg, var(--bg-muted) 25%, var(--bg-surface-hover) 50%, var(--bg-muted) 75%)",
    backgroundSize: "200% 100%",
    borderRadius: "var(--radius-sm)",
    width,
    height: height || "1rem",
    opacity: 0.6,
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    text: { borderRadius: "var(--radius-sm)", height: height || "1rem" },
    circular: { borderRadius: "50%", width: width || "40px", height: height || "40px" },
    rectangular: { borderRadius: "var(--radius-md)", width: "100%", height: height || "100px" },
    card: { borderRadius: "var(--radius-lg)", width: "100%", height: height || "200px" },
    stat: { borderRadius: "var(--radius-md)", width: "100%", height: height || "120px" },
    chart: { borderRadius: "var(--radius-lg)", width: "100%", height: height || "300px" },
  };

  const animationStyles: Record<string, React.CSSProperties> = {
    pulse: { animation: "skeleton-pulse 1.5s ease-in-out infinite" },
    wave: { animation: "skeleton-wave 1.5s ease-in-out infinite" },
    none: {},
  };

  const combinedClassName = `skeleton skeleton--${variant} ${className}`;

  return (
    <div
      className={combinedClassName}
      style={{
        ...baseStyles,
        ...variantStyles[variant],
        ...animationStyles[animation],
      }}
      aria-hidden="true"
    />
  );
};

export const SkeletonText: React.FC<{ lines?: number; width?: string | number }> = ({
  lines = 1,
  width = "100%",
}) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "8px", width }}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} variant="text" width={i === lines - 1 ? "60%" : width} />
    ))}
  </div>
);

export const SkeletonCard: React.FC<{ height?: string | number }> = ({ height }) => (
  <Skeleton variant="card" height={height} />
);

export const SkeletonStat: React.FC = () => (
  <div className="skeleton-stat" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
    <Skeleton variant="text" width="40%" height="14px" />
    <Skeleton variant="text" width="80%" height="32px" animation="wave" />
    <Skeleton variant="text" width="60%" height="12px" />
  </div>
);

export const SkeletonChart: React.FC<{ height?: string | number }> = ({ height }) => (
  <Skeleton variant="chart" height={height} />
);

export const SkeletonTableRow: React.FC<{ columns?: number }> = ({ columns = 4 }) => (
  <div className="skeleton-table-row" style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: "16px", padding: "12px 0" }}>
    {Array.from({ length: columns }).map((_, i) => (
      <Skeleton key={i} variant="text" width="80%" height="16px" />
    ))}
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 4,
}) => (
  <div className="skeleton-table" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: "16px", fontWeight: 600, color: "var(--text-tertiary)", fontSize: "var(--text-xs)" }}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={`header-${i}`} variant="text" width="60%" height="12px" animation="none" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <SkeletonTableRow key={i} columns={columns} />
    ))}
  </div>
);

export default Skeleton;