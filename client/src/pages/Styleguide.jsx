import { useEffect, useRef, useState } from 'react'
import Aura from '../components/ui/Aura'
import Paddle from '../components/ui/Paddle'
import RollingNumber from '../components/ui/RollingNumber'
import SoldStamp from '../components/ui/SoldStamp'
import Popup from '../components/ui/Popup'
import Toast from '../components/ui/Toast'
import Button from '../components/ui/Button'
import { useFranchises } from '../hooks/useFranchises'
import { formatMoney } from '../utils/money'
import { teamStyle, deriveGlow, CUSTOM_COLOURS, HOUSE_GLOW } from '../utils/color'

// Development-only page: every Bidzy building block, in real team colours.
// Not a product page; it's here so the pieces can be checked before pages use them.

// the room's default bid steps, in lakhs
const nextStep=(price)=>price<100 ? 5 : price<200 ? 10 : price<500 ? 20 : 25

const TOKENS=[
    ['night','bg-night','The base'],
    ['night-2','bg-night-2','Popups, raised cards'],
    ['platter','bg-platter','Content on a glow'],
    ['fg','bg-fg','Text'],
    ['fg-2','bg-fg-2','Secondary text'],
    ['sold','bg-sold','Sold'],
    ['alert','bg-alert','Outbid, errors']
]

const Section=({eyebrow,title,children})=>(
    <section className="py-20">
        <div className="mb-9 grid max-w-[640px] gap-2.5">
            <span className="text-xs font-semibold uppercase tracking-[.16em] text-fg-2">{eyebrow}</span>
            <h2 className="font-num text-[44px] leading-[.95] font-extrabold uppercase">{title}</h2>
        </div>
        {children}
    </section>
)

const Pill=({children})=>(
    <span className="rounded-full border border-line bg-night/45 px-2.5 py-1 text-[13px] font-semibold">{children}</span>
)

function Styleguide() {
    const {franchises,byCode,loading,error}=useFranchises()
    const [mine,setMine]=useState('CSK')
    const [house,setHouse]=useState(true)
    const [custom,setCustom]=useState(CUSTOM_COLOURS[0])
    const [lot,setLot]=useState({price:420,leader:'CSK',challenger:'MI',sold:false,round:0})
    const [popupOpen,setPopupOpen]=useState(false)
    const [toast,setToast]=useState(null)
    const toastTimer=useRef(null)

    const say=(next)=>{
        setToast(next)
        clearTimeout(toastTimer.current)
        toastTimer.current=setTimeout(()=>setToast(null),2800)
    }
    useEffect(()=>()=>clearTimeout(toastTimer.current),[])

    if(loading){
        return <div className="grid min-h-screen place-items-center bg-night font-text text-fg-2">Warming up the floodlights…</div>
    }
    if(error||franchises.length===0){
        return <div className="grid min-h-screen place-items-center bg-night font-text text-fg-2">Couldn't load team colours. Is the server running on 5050?</div>
    }

    const my=byCode[mine]
    const rival=mine==='MI' ? 'CSK' : 'MI'

    const raise=(code)=>{
        setLot(prev=>{
            if(prev.sold) return prev
            if(code===prev.leader){
                if(code===mine) say({title:'Already leading.',message:'Your paddle is the highest. Sit tight.',tone:'info'})
                return prev
            }
            return {...prev,price:prev.price+nextStep(prev.price),challenger:prev.leader,leader:code}
        })
    }
    const race=()=>{
        raise(rival)
        say({title:'Beaten.',message:`${rival} got there 0.03 s before you.`,tone:'bad'})
    }
    const hammer=()=>{
        setLot(prev=>({...prev,sold:true,round:prev.round+1}))
        setTimeout(()=>setLot(prev=>({price:420,leader:mine,challenger:rival,sold:false,round:prev.round})),3200)
    }
    const pick=(code)=>{
        setHouse(false)
        setMine(code)
        setLot(prev=>({price:420,leader:code,challenger:code==='MI' ? 'CSK' : 'MI',sold:false,round:prev.round}))
    }

    return (
        <div className="min-h-screen bg-night font-text text-fg antialiased">
            {/* hero: the page in your colours */}
            <Aura glow={house ? HOUSE_GLOW : my.glow} variant="page" as="header" className="pt-24 pb-18">
                <div className="mx-auto grid max-w-[1080px] gap-5 px-5">
                    <span className="font-num text-[22px] font-black tracking-[.06em]">BIDZY · STYLEGUIDE</span>
                    <h1 className="max-w-[11ch] font-num text-[clamp(54px,9.5vw,120px)] leading-[.88] font-black uppercase">Every bid builds your XI</h1>
                    <p className="m-0 max-w-[46ch] text-lg text-fg-2">Bidzy's own pitch-green glow outside a room. Pick a franchise to see a team's colours instead.</p>
                    <div className="flex flex-wrap gap-3">
                        <Button kind="primary" arrow>Create a room</Button>
                        <Button kind="secondary">Join with a code</Button>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Pick a franchise">
                        <button
                            type="button"
                            onClick={()=>setHouse(true)}
                            aria-pressed={house}
                            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line bg-night/35 py-[7px] pr-3.5 pl-2 text-sm font-semibold transition-colors
                                hover:border-white/25 aria-pressed:border-fg aria-pressed:bg-fg aria-pressed:text-night"
                        >
                            <span className="size-[18px] rounded-full bg-pitch" />
                            Bidzy
                        </button>
                        {franchises.map(f=>(
                            <button
                                key={f.code}
                                type="button"
                                onClick={()=>pick(f.code)}
                                aria-pressed={!house&&f.code===mine}
                                style={teamStyle(f.glow)}
                                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line bg-night/35 py-[7px] pr-3.5 pl-2 text-sm font-semibold transition-colors
                                    hover:border-white/25 aria-pressed:border-fg aria-pressed:bg-fg aria-pressed:text-night"
                            >
                                <span className="relative size-[18px] overflow-hidden rounded-full" style={{background:'var(--team-p)'}}>
                                    <span className="absolute -right-[3px] -bottom-[3px] size-2.5 rounded-full" style={{background:'var(--team-acc-solid)'}} />
                                </span>
                                {f.code}
                            </button>
                        ))}
                    </div>
                </div>
            </Aura>

            <main className="mx-auto max-w-[1080px] px-5">
                <Section eyebrow="Aura + RollingNumber + Paddle + SoldStamp" title="The auction floor">
                    <Aura glow={byCode[lot.leader].glow} accent={byCode[lot.challenger].glow.p} className="rounded-[28px] border border-line p-[clamp(20px,4vw,40px)]">
                        <div className="grid items-end gap-[clamp(20px,4vw,48px)] md:grid-cols-2">
                            <div className="grid gap-3.5">
                                <div className="flex flex-wrap gap-2"><Pill>Marquee · Lot 14</Pill><Pill>Wicketkeeper</Pill><Pill>India</Pill></div>
                                <div className="relative">
                                    <h3 className="font-num text-[clamp(56px,8vw,96px)] leading-[.86] font-black uppercase">MS Dhoni</h3>
                                    {lot.sold && <SoldStamp key={lot.round} sold />}
                                </div>
                            </div>
                            <div className="grid justify-items-start gap-4">
                                <p className="m-0 flex items-center gap-3 text-[15px] text-fg-2">
                                    <span className="size-3 rounded-full" style={{background:byCode[lot.leader].glow.p}} />
                                    Leading: <b className="font-semibold text-fg">{byCode[lot.leader].name}</b>
                                </p>
                                <RollingNumber value={formatMoney(lot.price)} className="font-num text-[clamp(76px,11vw,132px)] font-black" />
                                <div className="flex flex-wrap items-center gap-3.5">
                                    <Paddle glow={my.glow} code={mine} amount={formatMoney(lot.price+nextStep(lot.price))} onBid={()=>raise(mine)} disabled={lot.sold} />
                                    <span className="grid text-sm text-fg-2">You can still bid<b className="text-lg text-fg tabular-nums">{formatMoney(1215)}</b></span>
                                </div>
                            </div>
                        </div>
                    </Aura>
                    <div className="mt-7 flex flex-wrap items-center gap-3">
                        {['MI','RCB','KKR'].filter(c=>c!==mine).map(c=>(
                            <Button key={c} kind="team" size="sm" glow={byCode[c].glow} onClick={()=>raise(c)}>{c} raises</Button>
                        ))}
                        <Button kind="secondary" size="sm" onClick={race}>Both press at once</Button>
                        <Button kind="primary" size="sm" onClick={hammer} disabled={lot.sold}>Bring down the hammer</Button>
                    </div>
                </Section>

                <Section eyebrow="Button" title="Every button is a light">
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
                        {[
                            ['Primary','Brightest light. One per screen.',<Button key="p" kind="primary" arrow>Create a room</Button>],
                            ['Secondary','A dimmer light beside it.',<Button key="s" kind="secondary">Join with a code</Button>],
                            ['Quiet','Small actions and links.',<Button key="q" kind="quiet">Room settings</Button>],
                            ['Danger','Things you can\'t take back.',<Button key="d" kind="danger">Reset auction</Button>],
                            ['Small','Room cards, the nav, popups.',<span key="sm" className="flex flex-wrap gap-2.5"><Button kind="primary" size="sm">Enter room</Button><Button kind="secondary" size="sm">Copy code</Button></span>],
                            ['Disabled','The light is off.',<Button key="x" kind="primary" disabled>Start auction</Button>]
                        ].map(([name,use,demo])=>(
                            <div key={name} className="grid content-start gap-4 rounded-[20px] border border-line bg-night-2 p-5">
                                <div><b className="text-[15px]">{name}</b><p className="m-0 text-sm text-fg-2">{use}</p></div>
                                <div>{demo}</div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-6 flex flex-wrap gap-3">
                        {franchises.map(f=>(
                            <Button key={f.code} kind="team" glow={f.glow} size="sm">{f.code}</Button>
                        ))}
                    </div>
                    <p className="mt-3 text-sm text-fg-2">Team lights: dark brand colours (MI, KKR, GT) are brightened for the light so they still shine.</p>
                </Section>

                <Section eyebrow="deriveGlow" title="Custom teams pick any colour">
                    <div className="grid items-start gap-[clamp(20px,4vw,48px)] md:grid-cols-2">
                        <div className="grid gap-5">
                            <p className="m-0 text-fg-2">In a custom room there are no franchises. Pick a colour and Bidzy builds the glow, paddle and button light from it. Too-dark colours are lifted, too-bright ones calmed.</p>
                            <div className="grid grid-cols-6 gap-2.5" role="group" aria-label="Team colours">
                                {CUSTOM_COLOURS.map(c=>(
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={()=>setCustom(c)}
                                        aria-label={`Colour ${c}`}
                                        aria-pressed={custom.toLowerCase()===c.toLowerCase()}
                                        className="aspect-square cursor-pointer rounded-[14px] border-2 border-transparent transition-transform hover:scale-105 aria-pressed:border-fg"
                                        style={{background:c}}
                                    />
                                ))}
                            </div>
                            <label htmlFor="sg-any-colour" className="flex items-center gap-3 text-sm text-fg-2">
                                <input id="sg-any-colour" type="color" value={custom} onChange={(e)=>setCustom(e.target.value)}
                                    className="size-[46px] cursor-pointer rounded-xl border border-line bg-transparent p-[3px]" />
                                Or any colour you like ({custom.toUpperCase()})
                            </label>
                        </div>
                        <Aura glow={deriveGlow(custom)} className="grid min-h-[280px] content-between gap-6 rounded-3xl border border-line p-6">
                            <div>
                                <span className="text-sm text-fg-2">Custom room · Hostel Mega Auction</span>
                                <h3 className="font-num text-[44px] leading-[.9] font-black uppercase">Gully XI</h3>
                            </div>
                            <div className="flex flex-wrap items-center gap-3.5">
                                <Paddle glow={deriveGlow(custom)} code="GXI" amount={formatMoney(440)} />
                                <Button kind="team" glow={deriveGlow(custom)}>Start auction</Button>
                            </div>
                        </Aura>
                    </div>
                </Section>

                <Section eyebrow="Tokens" title="One night, every colour has a job">
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3.5">
                        {TOKENS.map(([name,cls,use])=>(
                            <div key={name} className="overflow-hidden rounded-2xl border border-line bg-night-2">
                                <div className={`h-14 ${cls}`} />
                                <div className="px-3.5 py-2.5 text-xs text-fg-2"><b className="block text-[13px] text-fg">{name}</b>{use}</div>
                            </div>
                        ))}
                    </div>
                </Section>

                <Section eyebrow="Franchises (from GET /rooms/franchises)" title="Ten glows">
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3.5">
                        {franchises.map(f=>(
                            <button key={f.code} type="button" onClick={()=>pick(f.code)} style={teamStyle(f.glow)}
                                className="cursor-pointer overflow-hidden rounded-[20px] border border-line bg-night-2 p-0 text-left">
                                <span className="relative block h-[110px]" style={{background:'radial-gradient(95% 120% at 20% 10% in oklab,var(--team-p),transparent 72%),radial-gradient(80% 110% at 70% 60% in oklab,var(--team-pd),transparent 74%),var(--color-night)'}}>
                                    <span className="absolute top-3.5 right-3.5 size-7 rounded-full shadow-[0_2px_8px_rgb(0_0_0/.35)]" style={{background:'var(--team-acc-solid)'}} />
                                </span>
                                <span className="flex items-baseline justify-between gap-2 px-3.5 py-3">
                                    <b className="font-num text-[22px]">{f.code}</b><span className="text-xs text-fg-2">{f.name}</span>
                                </span>
                            </button>
                        ))}
                    </div>
                </Section>

                <Section eyebrow="Type + money" title="Numbers you can read across a room">
                    <div className="grid gap-4">
                        {[['Numbers','font-num text-[64px] leading-[.9] font-black',`${formatMoney(1850)} · No. 7`],
                          ['Headline','font-num text-4xl leading-none font-extrabold uppercase','Marquee set opens'],
                          ['Text','max-w-[62ch]','Instrument Sans for everything you read. Tabular figures keep ₹45 L and ₹1.20 Cr lined up, so prices never jitter while they roll.']
                        ].map(([label,cls,sample])=>(
                            <div key={label} className="grid items-baseline gap-3.5 border-b border-line pb-3 sm:grid-cols-[130px_1fr]">
                                <span className="text-xs font-semibold uppercase tracking-[.16em] text-fg-2">{label}</span>
                                <span className={cls}>{sample}</span>
                            </div>
                        ))}
                        <p className="m-0 text-sm text-fg-2">formatMoney: 45 → {formatMoney(45)} · 420 → {formatMoney(420)} · 200 → {formatMoney(200)} · 12000 → {formatMoney(12000)}</p>
                    </div>
                </Section>

                <Section eyebrow="Popup + Toast" title="Asking and telling">
                    <div className="flex flex-wrap gap-2.5">
                        <Button kind="primary" size="sm" onClick={()=>setPopupOpen(true)}>Open a popup</Button>
                        <Button kind="secondary" size="sm" onClick={()=>say({title:'Sold.',message:`Dhoni walks in for ${formatMoney(440)}. Pencil him in at No. 7?`,tone:'good'})}>Good toast</Button>
                        <Button kind="secondary" size="sm" onClick={()=>say({title:'Squad\'s full.',message:'25 players is a team and the bench.',tone:'bad'})}>Bad toast</Button>
                        <Button kind="secondary" size="sm" onClick={()=>say({title:'Reconnecting.',message:'The scorer dropped the line. Catching up…',tone:'info'})}>Info toast</Button>
                    </div>
                </Section>
            </main>

            <Popup
                open={popupOpen}
                onClose={()=>setPopupOpen(false)}
                title="Start the auction?"
                actions={<>
                    <Button kind="secondary" size="sm" onClick={()=>setPopupOpen(false)}>Not yet</Button>
                    <Button kind="primary" size="sm" onClick={()=>setPopupOpen(false)}>Start</Button>
                </>}
            >
                Settings lock once the first player is up.
            </Popup>
            {toast && <Toast {...toast} />}
        </div>
    )
}

export default Styleguide
