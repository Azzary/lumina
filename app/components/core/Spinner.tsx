"use client";
import "./Spinner.css";

export default function Spinner({
  size = 24,
  label = "Loading",
  className = "",
}: {
  size?: number;
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={`ui__spinner ${className}`}
      role="status"
      aria-label={label}
      style={{ width: size, height: size }}
    />
  );
}
