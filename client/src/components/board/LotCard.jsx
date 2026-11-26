import { useState } from 'react'
import TeamTag from './TeamTag'
import Gavel from '../ui/Gavel'
import SoldStamp from '../ui/SoldStamp'
import PhotoCredit from '../ui/PhotoCredit'
import { formatMoney } from '../../utils/money'
import { statsFor, isOverseas, initials, shortName } from '../../utils/board'

const chip='rounded-full border border-white/15 bg-night/60 px-2.5 pt-[5px] pb-1 text-[11px] font-bold tracking-[.12em] uppercase'

// The player on the block: photo fading in from the right, name, stats, the current bid and the last few bids.
//   leader: the team on top (or null), mine: true when that's you
//   feed: [{key, team, amount}] newest first
//   hammer: null, or {key, sold, detail} while the gavel comes down
function LotCard({ player, lotLabel, homeCountry, price, leader, mine, feed, franchisesByCode, hammer }) {
    const [photoFailed,setPhotoFailed]=useState(false)
    const showPhoto=player.image&&!photoFailed
    const overseas=isOverseas(player,homeCountry)

    return (
        <article
            className={`relative isolate grid min-h-[400px] content-between gap-5 overflow-hidden rounded-[26px] border border-white/15 bg-night-2 p-[22px] ${hammer?.sold ? 'bz-thud' : ''}`}
            aria-label={`${player.name} on the block`}
        >
            {showPhoto
                ? <img key={`photo-${player._id}`} src={player.image} alt="" onError={()=>setPhotoFailed(true)}
                    className="bz-lot-photo bz-slide-in absolute inset-y-0 right-0 -z-20 h-full w-[58%] object-cover object-[50%_12%] opacity-90" />
                : <span key={`initials-${player._id}`} aria-hidden="true"
                    className="bz-lot-photo pointer-events-none absolute inset-y-0 right-0 -z-20 grid w-[58%] place-items-center font-num text-[clamp(120px,22vw,260px)] font-black text-white/[.07]">
                    {initials(player.name)}
                  </span>}
            {showPhoto && <PhotoCredit credit={player.imageCredit} oneLine className="absolute right-[22px] bottom-[5px] max-w-[min(58%,420px)] justify-end text-[10px]! text-fg-2!" />}
            {/* darkens the bottom so the numbers read, and tints the corner in the leader's colour */}
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10"
                style={{background:'linear-gradient(to top,rgb(13 17 23 / .96) 0%,rgb(13 17 23 / .25) 55%,transparent 80%)'}} />

            <div key={`who-${player._id}`} className="bz-slide-in">
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className={chip}>{player.role}</span>
                    {player.country && <span className={chip}>{player.country}</span>}
                    {overseas && <span className={`${chip} border-[#F0B93A]/50 text-[#F6D77A]`}>Overseas</span>}
                    {lotLabel && <span className="ml-1 text-xs font-semibold text-fg-3">{lotLabel}</span>}
                </div>
                <h1 className="mt-2.5 mb-1 max-w-[9ch] font-num text-[clamp(48px,7vw,92px)] leading-[.86] font-black uppercase [text-shadow:0_2px_30px_rgb(0_0_0/.5)] [text-wrap:balance]">
                    {player.name}
                </h1>
                <div className="text-sm text-fg-2">Base price <b className="text-fg">{formatMoney(player.basePrice)}</b></div>
            </div>

            <div className="grid gap-4">
                <div className="grid max-w-[520px] grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-line bg-line sm:grid-cols-4">
                    {statsFor(player).map(([label,value])=>(
                        <div key={label} className="grid bg-night-2/80 px-3 pt-2.5 pb-[9px] backdrop-blur-sm">
                            <small className="text-[10px] font-bold tracking-[.14em] text-fg-3 uppercase">{label}</small>
                            <b className="font-num text-[26px] leading-[1.05] font-extrabold tabular-nums">{value}</b>
                        </div>
                    ))}
                </div>

                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <small className="block text-[11px] font-bold tracking-[.14em] text-fg-3 uppercase">{leader ? 'Current bid' : 'Opening at'}</small>
                        <span key={price} className="bz-bump inline-block font-num text-[clamp(44px,6vw,72px)] leading-[.95] font-black tabular-nums">{formatMoney(price)}</span>
                        <div className="mt-1.5 flex items-center gap-2 text-[15px] text-fg-2">
                            {!leader && 'No bids yet'}
                            {leader && mine && <><TeamTag team={leader} franchisesByCode={franchisesByCode} /><b className="text-fg">You lead</b></>}
                            {leader && !mine && <><TeamTag team={leader} franchisesByCode={franchisesByCode} /><b className="text-fg">{shortName(leader)}</b> with {formatMoney(price)}</>}
                        </div>
                    </div>
                    {feed.length>0 && (
                        <ol className="m-0 grid min-w-[200px] list-none gap-1 p-0" aria-label="Latest bids">
                            {feed.slice(0,3).map((bid,i)=>(
                                <li key={bid.key} className={`bz-slide-in flex items-center gap-2 text-[13px] text-fg-2 ${i===1 ? 'opacity-70' : i===2 ? 'opacity-45' : ''}`}>
                                    {bid.team ? <TeamTag team={bid.team} franchisesByCode={franchisesByCode} /> : <span className="min-w-10" />}
                                    <b className="font-num text-[17px] text-fg tabular-nums">{formatMoney(bid.amount)}</b>
                                    <span className="ml-auto text-xs text-fg-3">{i===0 ? 'now' : 'earlier'}</span>
                                </li>
                            ))}
                        </ol>
                    )}
                </div>
            </div>

            {hammer && (
                <>
                    {hammer.sold && <Gavel key={`g${hammer.key}`} />}
                    <span className="absolute top-[86px] left-[18px] z-[3]">
                        <span className="relative block">
                            <SoldStamp key={`s${hammer.key}`} sold={hammer.sold} detail={hammer.detail} className="text-[clamp(56px,9vw,96px)]!" />
                        </span>
                    </span>
                </>
            )}
        </article>
    )
}

export default LotCard
