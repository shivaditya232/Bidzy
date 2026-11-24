import { XI_OVERSEAS_MAX } from '../../utils/xi'

// The three readings above the sheet. While you drag, they show the XI as it would be if you dropped there.
//   bal:      balance() of the XI being shown
//   preview:  true while showing a "what if"
//   overseas: overseas starters now; ghost = an overseas card is in your hand ready to come in; shake = refused
function XiMeters({ bal, preview, overseas, ghost, shake }) {
    const full=overseas>=XI_OVERSEAS_MAX
    return (
        <div className="xi-meters">
            <div className={`xi-seesaw ${preview ? 'is-preview' : ''}`} role="img" aria-label={`Team balance: ${bal.lean}, ${bal.bat} batting and ${bal.bowl} bowling`}>
                <svg viewBox="0 0 230 66" aria-hidden="true">
                    <defs>
                        <linearGradient id="xi-gold" x1="0" x2="1">
                            <stop offset="0" stopColor="#B8862A" /><stop offset=".5" stopColor="#FFF1B8" /><stop offset="1" stopColor="#B8862A" />
                        </linearGradient>
                    </defs>
                    <polygon points="115,42 101,64 129,64" fill="url(#xi-gold)" opacity=".7" />
                    {/* lights up when a keeper is in */}
                    <circle cx="115" cy="56" r="4.5" fill={bal.keeper ? '#22D3EE' : 'rgba(255,255,255,.2)'} />
                    <g className="xi-beam" style={{transform:`rotate(${bal.tilt}deg)`}}>
                        <rect x="14" y="39" width="202" height="6" rx="3" fill="url(#xi-gold)" />
                        <rect x="4" y="12" width="64" height="25" rx="8" fill="#FFB020" />
                        <text x="36" y="29" textAnchor="middle" fontFamily="Big Shoulders Display,sans-serif" fontWeight="900" fontSize="14" fill="#0A0D12">BAT {bal.bat}</text>
                        <rect x="162" y="12" width="64" height="25" rx="8" fill="#34D399" />
                        <text x="194" y="29" textAnchor="middle" fontFamily="Big Shoulders Display,sans-serif" fontWeight="900" fontSize="14" fill="#0A0D12">BOWL {bal.bowl}</text>
                    </g>
                </svg>
                <small>{preview ? 'If you drop: ' : ''}{bal.lean}</small>
            </div>

            <div className={`xi-stamps ${full ? 'is-full' : ''} ${shake ? 'is-shake' : ''}`} key={`stamps-${shake}`}>
                <div className="xi-row" aria-hidden="true">
                    {Array.from({length:XI_OVERSEAS_MAX},(_,i)=>(
                        <span key={`stamp-${i}`} className={`xi-stamp ${i<overseas ? 'is-on' : ''} ${ghost&&i===overseas ? 'is-ghost' : ''}`}>OS</span>
                    ))}
                </div>
                <span className="xi-meter-label">{shake&&full ? 'No overseas spot left' : `Overseas ${overseas} of ${XI_OVERSEAS_MAX}`}</span>
            </div>

            <div className="xi-facts">
                <span className={`xi-ck ${bal.placed===11 ? 'is-ok' : ''}`}><b>{bal.placed}</b>/11 placed</span>
                {bal.keeper ? <span className="xi-ck is-ok">Keeper in</span> : <span className="xi-ck is-hint">No keeper yet</span>}
                {bal.bowlingOptions>=5
                    ? <span className="xi-ck is-ok">{bal.bowlingOptions} bowling options</span>
                    : <span className="xi-ck is-hint">Only {bal.bowlingOptions} bowling option{bal.bowlingOptions===1 ? '' : 's'}</span>}
            </div>
        </div>
    )
}

export default XiMeters
