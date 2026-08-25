import type { CSSProperties, ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
}

export default function Card({ children, className, style, onClick }: CardProps) {
  const classes = ["card", className].filter(Boolean).join(" ");
  if (onClick) {
    return (
      <button type="button" className={`${classes} card--interactive`} style={style} onClick={onClick}>
        {children}
      </button>
    );
  }
  return (
    <div className={classes} style={style}>
      {children}
    </div>
  );
}
