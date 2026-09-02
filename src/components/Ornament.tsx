/** Decorative sand-colored flowing line, used as connective tissue between sections. */
export default function Ornament({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1200 60"
      fill="none"
      aria-hidden="true"
      className={`h-10 w-full ${className}`}
      preserveAspectRatio="none"
    >
      <path
        d="M0 30 C 200 6, 400 54, 600 30 C 800 6, 1000 54, 1200 30"
        stroke="#DEC9B8"
        strokeWidth="1.5"
      />
      <path d="M600 22 L608 30 L600 38 L592 30 Z" fill="#DEC9B8" />
    </svg>
  )
}
