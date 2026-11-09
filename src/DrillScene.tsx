export default function DrillScene() {
  return (
    <svg
      className="hero-drill-illustration"
      viewBox="0 0 360 280"
      role="img"
      aria-label="Illustration of a cordless workshop drill"
    >
      <defs>
        <linearGradient id="drill-body" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#f4a35f" />
          <stop offset="1" stopColor="#b94e2c" />
        </linearGradient>
        <linearGradient id="drill-grip" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#354a50" />
          <stop offset="1" stopColor="#17272e" />
        </linearGradient>
        <filter id="drill-shadow" x="-.3" y="-.3" width="1.6" height="1.8">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>
      <ellipse cx="176" cy="234" rx="112" ry="15" fill="#03070b" opacity=".42" filter="url(#drill-shadow)" />
      <g transform="rotate(-8 180 140)">
        <path d="M259 103h50v50h-50z" fill="#536168" stroke="#9eaaa5" strokeWidth="4" />
        <path d="M305 116h31v24h-31z" fill="#abb5ae" />
        <path d="M332 124h22v8h-22z" fill="#d2c8ae" />
        <path d="M119 77q0-12 12-12h124q15 0 15 15v81q0 14-14 14H126q-11 0-11-12z" fill="url(#drill-body)" stroke="#ffd19a" strokeOpacity=".7" strokeWidth="4" />
        <path d="M135 94h97v8h-97z" fill="#ffe1b5" opacity=".78" />
        <path d="M130 112h112v46H130z" fill="#d66b3c" opacity=".45" />
        <path d="M157 175h69l-10 45q-2 10-13 10h-34q-10 0-12-10z" fill="url(#drill-grip)" stroke="#84948d" strokeWidth="3" />
        <path d="M163 187h53m-48 12h42m-37 12h32" stroke="#71827e" strokeWidth="4" strokeLinecap="round" opacity=".72" />
        <path d="M146 173h44v10h-44z" fill="#e4aa51" />
        <path d="M176 223h42l13 17q2 5-5 5h-57q-6 0-3-6z" fill="#e4aa51" stroke="#ffd58d" strokeWidth="3" />
        <path d="M181 230h38" stroke="#fff0c8" strokeWidth="3" strokeLinecap="round" opacity=".78" />
        <path d="M198 65v-14q0-6 6-6h34q6 0 6 6v14z" fill="#42565c" stroke="#92a29a" strokeWidth="3" />
        <circle cx="142" cy="131" r="10" fill="#f3bf66" />
        <circle cx="142" cy="131" r="4" fill="#fff1ce" />
      </g>
    </svg>
  )
}
