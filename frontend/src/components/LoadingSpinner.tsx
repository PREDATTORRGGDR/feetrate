interface LoadingSpinnerProps {
  label?: string;
}

export default function LoadingSpinner({ label }: LoadingSpinnerProps) {
  return (
    <div className="loading-spinner">
      <div className="loading-spinner__ring" />
      {label ? <p className="loading-spinner__label">{label}</p> : null}
    </div>
  );
}
