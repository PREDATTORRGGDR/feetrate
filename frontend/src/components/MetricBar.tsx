import { useEffect, useState } from "react";

interface MetricBarProps {
  label: string;
  value: number;
}

export default function MetricBar({ label, value }: MetricBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setWidth(clamped));
    return () => cancelAnimationFrame(frame);
  }, [clamped]);

  return (
    <div className="metric-bar">
      <div className="metric-bar__head">
        <span className="metric-bar__label">{label}</span>
        <span className="metric-bar__value">{Math.round(clamped)}/100</span>
      </div>
      <div className="metric-bar__track">
        <div className="metric-bar__fill" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
