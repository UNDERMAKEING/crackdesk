const Logo = ({ className = "h-9 w-9" }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
    >
      <defs>
        <linearGradient id="gradBlue" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1D4ED8" />
          <stop offset="100%" stopColor="#22D3EE" />
        </linearGradient>

        <linearGradient id="gradPurple" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#6D28D9" />
        </linearGradient>
      </defs>

      {/* LEFT (Blue Bars) */}
      <rect x="10" y="30" width="35" height="12" rx="6" fill="url(#gradBlue)" />
      <rect x="10" y="50" width="30" height="12" rx="6" fill="url(#gradBlue)" />
      <rect x="10" y="70" width="25" height="12" rx="6" fill="url(#gradBlue)" />

      {/* RIGHT (Purple Bars) */}
      <rect x="55" y="20" width="35" height="12" rx="6" fill="url(#gradPurple)" />
      <rect x="55" y="40" width="30" height="12" rx="6" fill="url(#gradPurple)" />
      <rect x="55" y="60" width="25" height="12" rx="6" fill="url(#gradPurple)" />
      <rect x="55" y="80" width="20" height="12" rx="6" fill="url(#gradPurple)" />
    </svg>
  );
};

export default Logo;