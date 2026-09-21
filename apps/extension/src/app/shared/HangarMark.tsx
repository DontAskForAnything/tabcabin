export function HangarMark({
  size = 20,
  strokeWidth = 2,
}: {
  size?: number
  strokeWidth?: number
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 20V11a9 9 0 0 1 18 0v9" />
      <path d="M7 20v-6h10v6" />
      <path d="M7 17h10" />
    </svg>
  )
}
