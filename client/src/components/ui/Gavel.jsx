// The hammer coming down: a wooden gavel swings onto a sound block and a ring ripples out.
// Put it inside a `relative` box. It plays once each time it mounts (give it a new key to replay).
function Gavel() {
    return (
        <svg className="bz-gavel" viewBox="0 0 300 190" aria-hidden="true">
            <defs>
                <linearGradient id="bz-wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b98745" /><stop offset=".45" stopColor="#8a5a24" /><stop offset="1" stopColor="#4b2e10" /></linearGradient>
                <linearGradient id="bz-wood-dark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a87636" /><stop offset="1" stopColor="#5c3a15" /></linearGradient>
                <linearGradient id="bz-brass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFF1B8" /><stop offset=".4" stopColor="#E9C25A" /><stop offset="1" stopColor="#8F6A17" /></linearGradient>
            </defs>
            <g>
                <ellipse cx="92" cy="176" rx="74" ry="11" fill="#2a1a08" />
                <rect x="18" y="158" width="148" height="18" rx="9" fill="url(#bz-wood-dark)" />
                <ellipse cx="92" cy="158" rx="74" ry="11" fill="#c18f4e" />
            </g>
            <ellipse className="bz-gavel-hit" cx="92" cy="152" rx="40" ry="10" fill="none" stroke="#FFF1CF" strokeWidth="3" />
            <g className="bz-gavel-arm">
                <rect x="92" y="88" width="178" height="13" rx="6.5" fill="url(#bz-wood-dark)" transform="rotate(-8 92 94)" />
                <rect x="40" y="70" width="104" height="76" rx="16" fill="url(#bz-wood)" />
                <rect x="40" y="70" width="14" height="76" rx="6" fill="#3a230b" />
                <rect x="130" y="70" width="14" height="76" rx="6" fill="#3a230b" />
                <rect x="60" y="70" width="7" height="76" fill="url(#bz-brass)" />
                <rect x="117" y="70" width="7" height="76" fill="url(#bz-brass)" />
                <rect x="46" y="74" width="92" height="8" rx="4" fill="#fff" opacity=".18" />
            </g>
        </svg>
    )
}

export default Gavel
