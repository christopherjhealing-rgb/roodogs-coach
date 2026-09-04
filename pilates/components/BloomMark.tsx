/** Simple flower mark in the brand mint. */
export default function BloomMark({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <g fill="#B9F5C7">
        <ellipse cx="24" cy="11" rx="6" ry="9" />
        <ellipse cx="24" cy="37" rx="6" ry="9" />
        <ellipse cx="11" cy="24" rx="9" ry="6" />
        <ellipse cx="37" cy="24" rx="9" ry="6" />
      </g>
      <circle cx="24" cy="24" r="6" fill="#1F3B2E" />
      <circle cx="24" cy="24" r="3" fill="#B9F5C7" />
    </svg>
  );
}
