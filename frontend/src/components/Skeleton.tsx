import React from "react";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: "text" | "circular" | "rectangular";
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  variant = "rectangular",
  className = "",
  style,
}) => {
  const baseStyle: React.CSSProperties = {
    width: width,
    height: height,
    ...style,
  };

  const variantClass = variant === "circular" ? "skeleton-round" : "";
  const typeClass = variant === "text" ? "skeleton-text" : "";

  return (
    <div
      className={`skeleton ${variantClass} ${typeClass} ${className}`}
      style={baseStyle}
      aria-hidden="true"
    />
  );
};
