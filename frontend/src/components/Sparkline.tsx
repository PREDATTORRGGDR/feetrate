interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
}

export default function Sparkline({ values, width = 320, height = 96 }: SparklineProps) {
  if (values.length === 0) {
    return <div className="sparkline sparkline--empty">Пока нет данных</div>;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const paddingX = 12;
  const paddingY = 16;
  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingY * 2;

  const points = values.map((value, index) => {
    const x = values.length === 1 ? paddingX : paddingX + (index / (values.length - 1)) * innerWidth;
    const y = paddingY + innerHeight - ((value - min) / range) * innerHeight;
    return { x, y, value };
  });

  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x},${height - paddingY} L${points[0].x},${height - paddingY} Z`;

  return (
    <div className="sparkline">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="sparkline__svg">
        <defs>
          <linearGradient id="sparkline-fill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#sparkline-fill)" stroke="none" />
        <path d={linePath} fill="none" stroke="var(--color-primary)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => (
          <circle key={index} cx={point.x} cy={point.y} r={4} fill="var(--color-primary)" />
        ))}
      </svg>
      <div className="sparkline__labels">
        {values.map((value, index) => (
          <span key={index} className="sparkline__label">
            {Math.round(value)}
            {index < values.length - 1 ? <span className="sparkline__arrow"> → </span> : null}
          </span>
        ))}
      </div>
    </div>
  );
}
