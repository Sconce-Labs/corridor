// The Corridor mark — a lit passage receding to a point. Mirrors
// corridor/assets/logo.svg. Inlined so it inherits currentColor context and
// needs no network fetch.
export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      role="img"
      aria-label="Corridor"
    >
      <defs>
        <linearGradient
          id="cr-rim"
          x1="96"
          y1="96"
          x2="416"
          y2="416"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#7DF9E6" />
          <stop offset="0.55" stopColor="#41C7EE" />
          <stop offset="1" stopColor="#2A7DE1" />
        </linearGradient>
        <radialGradient
          id="cr-core"
          cx="256"
          cy="248"
          r="40"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#EAFBF7" />
          <stop offset="1" stopColor="#41C7EE" />
        </radialGradient>
        <radialGradient
          id="cr-glow"
          cx="256"
          cy="256"
          r="230"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#12314A" stopOpacity="0.8" />
          <stop offset="1" stopColor="#0A0F1C" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="512" height="512" rx="116" fill="#0A0F1C" />
      <circle cx="256" cy="256" r="230" fill="url(#cr-glow)" />
      <g stroke="url(#cr-rim)" strokeLinejoin="round" fill="none">
        <rect
          x="94"
          y="94"
          width="324"
          height="324"
          rx="76"
          strokeWidth="15"
          opacity="0.95"
        />
        <rect
          x="146"
          y="146"
          width="220"
          height="220"
          rx="54"
          strokeWidth="13"
          opacity="0.66"
        />
        <rect
          x="192"
          y="192"
          width="128"
          height="128"
          rx="36"
          strokeWidth="11"
          opacity="0.42"
        />
      </g>
      <circle cx="256" cy="256" r="21" fill="url(#cr-core)" />
    </svg>
  );
}
