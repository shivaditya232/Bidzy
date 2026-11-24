import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import XiMeters from './XiMeters'
import { SheetCard, HandCard } from './XiCards'
import { isOverseas } from '../../utils/board'
import { teamStyle, inkOn } from '../../utils/color'
import { normalizeLineup, planDrop, applyDrop, balance, handOf, positionOf, backingUp, overseasStarters, lastName, XI_OVERSEAS_MAX } from '../../utils/xi'
import './xi.css'

const EDGE=72          // px at the top/bottom of the sheet that scroll it while you hold a card
const MAGNET=40        // px: a slot this close catches the card
const HOLD_MS=260      // press and hold this long on a phone to pick a card up
const SAVE_TEXT={idle:'All saved',saving:'Saving…',saved:'Saved',error:'Not saved'}

const buzz=()=>{ try{ navigator.vibrate?.(14) } catch{ /* not on this device */ } }

// Arrange your XI: drag the cards in your hand onto the numbered team sheet.
// Drop on a number to bat there, on a player to swap, on his right edge to make him a backup, back on the hand to take him out.
// Tapping works too (tap a card, then a number).
// Backups: tap the striped card backs behind a player (or his backup tag) and the pile turns over in his row:
// his backups lie face up as a deck and he alone shows his striped back on the right. Tap a card's edge to bring it
// to the front; drag onto a backup to replace or reorder him, onto the strip to add, back to the hand to remove.
//   lineup: your XI from the server   squad: the players you bought   onChange(nextLineup): save it (the board debounces)
//   saveState: 'idle' | 'saving' | 'saved' | 'error'
function XiBuilder({ lineup, squad, homeCountry, glow, saveState='idle', onChange, onClose }) {
    const xi=useMemo(()=>normalizeLineup(lineup),[lineup])
    const byId=useMemo(()=>Object.fromEntries(squad.map(p=>[String(p._id),p])),[squad])
    const isOs=useCallback((p)=>isOverseas(p,homeCountry),[homeCountry])
    const hand=handOf(squad,xi)

    const [held,setHeld]=useState(null)            // tapped card, waiting for a tap on a number
    const [drag,setDrag]=useState(null)            // {id, x, y} while a card is in the air
    const [hover,setHover]=useState(null)          // {zone, plan} what dropping here would do
    const [fx,setFx]=useState({})                  // {seq, landed, ripple, flip} after a drop
    const [say,setSay]=useState(null)              // {seq, text, bad}
    const [shake,setShake]=useState(0)             // overseas stamps shake when a card is refused
    const [edge,setEdge]=useState('')              // 'up' / 'down' / 'up-go' ... edge hints while dragging
    const [pile,setPile]=useState(null)            // {i, phase:'opening'|'open'|'closing'} the turned-over pile
    const [focus,setFocus]=useState(null)          // the backup pulled to the front of the pile
    const [announce,setAnnounce]=useState('')

    const rootRef=useRef(null)
    const sheetRef=useRef(null)
    const closeRef=useRef(null)
    const floatRef=useRef(null)
    const press=useRef(null)        // the pointer that went down on a card
    const dragRef=useRef(null)      // live drag data (changes every frame, so not state)
    const raf=useRef(0)
    const suppressClick=useRef(false)
    const timers=useRef([])
    const api=useRef({})            // latest drag functions, for the document listeners
    const seqRef=useRef(0)          // numbers each message / effect so a timer clears only its own

    const later=(fn,ms)=>{ timers.current.push(setTimeout(fn,ms)) }
    const tell=(text,bad=false)=>{
        const seq=++seqRef.current
        setSay({seq,text,bad})
        later(()=>setSay(s=>s?.seq===seq ? null : s),2400)
    }

    const ink=glow?.ink||inkOn(glow?.p)
    const light=ink!=='#FFFFFF'
    const rootStyle={
        ...teamStyle(glow),
        '--xi-stat':light ? ink : (glow?.metal ? '#FFE7A0' : '#FFFFFF'),
        '--xi-shadow':light ? 'none' : '0 1px 6px rgb(0 0 0 / .4)',
        // gold teams get the gold metal rim, the rest a rim in their own second colour
        '--xi-edge':glow?.metal ? 'var(--gold-metal)' : 'linear-gradient(135deg, var(--team-acc), color-mix(in oklab, var(--team-acc) 50%, #fff) 45%, var(--team-acc))'
    }

    // ---- making a move ----
    const commit=(id,zone)=>{
        const plan=planDrop(xi,id,zone,{byId,homeCountry})
        if(!plan) return false
        if(!plan.ok){
            tell(plan.why,true)
            if(plan.overseas){
                const seq=++seqRef.current
                setShake(seq)
                later(()=>setShake(v=>v===seq ? 0 : v),600)
            }
            return false
        }
        const there=zone.kind!=='hand' ? xi[zone.i].player : null
        const replaced=zone.kind==='pile' ? xi[zone.i].backups[zone.k] : null
        const name=byId[id]?.name
        const next=applyDrop(xi,id,zone)
        onChange(next)
        const seq=++seqRef.current
        const pileMove=['pile','pileAdd','unback','tuck'].includes(zone.kind)
        if(pile&&!pileMove) setPile(null) // the sheet changed under the open pile: close it
        if(zone.kind==='pile'||zone.kind==='pileAdd'){
            const text=replaced&&!next[zone.i].backups.includes(replaced)
                ? `${name} replaces ${byId[replaced]?.name}`
                : `${name} is backup ${next[zone.i].backups.indexOf(String(id))+1} for ${byId[there]?.name}`
            tell(text); setAnnounce(text); setFx({seq,pileLanded:String(id)})
        }
        else if(zone.kind==='unback'){ tell(`${name} is no longer a backup`); setAnnounce(`${name} is no longer a backup`) }
        else if(zone.kind==='hand'){ tell(`${name} back to your hand`); setAnnounce(`${name} back to your hand`) }
        else if(zone.kind==='tuck'){ tell(`${name} now backs up ${byId[there]?.name}`); setAnnounce(`${name} backs up ${byId[there]?.name}`); setFx({seq,ripple:zone.i}) }
        else{ setFx({seq,landed:String(id),ripple:zone.i,flip:there}); setAnnounce(`${name} bats at ${zone.i+1}`) }
        later(()=>setFx(f=>f.seq===seq ? {} : f),700)
        buzz()
        return true
    }

    // what's under the pointer: a slot (or one close enough), the hand, or nothing
    const zoneAt=(x,y)=>{
        const root=rootRef.current
        const sheet=sheetRef.current
        if(!root||!sheet) return null
        const el=document.elementFromPoint(x,y)
        const d=dragRef.current
        if(el?.closest('[data-hand]')){
            // a backup dragged out of the open pile stops backing him up
            if(d&&d.fromPile!==null&&positionOf(xi,d.id)===-1) return {kind:'unback',i:d.fromPile}
            return {kind:'hand'}
        }
        // the open pile: onto a backup card, or anywhere else in that row (his strip) = add
        const card=el?.closest('[data-pk]')
        if(card) return {kind:'pile',i:Number(card.dataset.pile),k:Number(card.dataset.pk)}
        if(pile&&el?.closest(`[data-slot="${pile.i}"]`)) return {kind:'pileAdd',i:pile.i}
        let slot=el?.closest('[data-slot]')
        if(!slot){
            const view=sheet.getBoundingClientRect()
            let best=MAGNET
            root.querySelectorAll('[data-slot]').forEach(s=>{
                const r=s.getBoundingClientRect()
                if(r.bottom<view.top||r.top>view.bottom) return // scrolled out of sight
                const d=Math.hypot(Math.max(r.left-x,0,x-r.right),Math.max(r.top-y,0,y-r.bottom))
                if(d<best){ best=d; slot=s }
            })
        }
        if(!slot) return null
        const i=Number(slot.dataset.slot)
        if(!xi[i].player) return {kind:'place',i}
        const r=slot.querySelector('[data-spot]').getBoundingClientRect()
        return {kind:x>r.right-r.width*.3 ? 'tuck' : 'swap',i}
    }

    // ---- dragging (pointer events; the floating card is moved directly, not through React) ----
    const startDrag=(id,x,y,src)=>{
        setHeld(null)
        const deck=src.closest('[data-deck]')
        dragRef.current={id,x,y,lx:x,key:'',zone:null,src,armed:Boolean(src.closest('[data-sheet]')),fromPile:deck ? Number(deck.dataset.deck) : null}
        setDrag({id,x,y})
        setHover(null)
        buzz()
        if(!raf.current) raf.current=requestAnimationFrame(()=>api.current.tick())
    }
    const moveDrag=(x,y)=>{
        const d=dragRef.current
        if(!d) return
        d.x=x; d.y=y
        const f=floatRef.current
        if(f){
            f.style.left=`${x}px`
            f.style.top=`${y}px`
            f.style.setProperty('--tilt',`${Math.max(-14,Math.min(14,(x-d.lx)*1.2))}deg`) // tilts the way you move it
        }
        d.lx=x
        const view=sheetRef.current?.getBoundingClientRect()
        if(view&&y>view.top+EDGE&&y<view.bottom-EDGE&&x>view.left&&x<view.right) d.armed=true // been inside the list once
        const zone=zoneAt(x,y)
        const key=zone ? `${zone.kind}${zone.i??''}.${zone.k??''}` : ''
        if(key===d.key) return
        d.key=key
        d.zone=zone
        setHover(zone ? {zone,plan:planDrop(xi,d.id,zone,{byId,homeCountry})} : null)
    }
    const endDrag=()=>{
        const d=dragRef.current
        if(!d) return
        dragRef.current=null
        cancelAnimationFrame(raf.current)
        raf.current=0
        setEdge('')
        setHover(null)
        if(d.zone&&commit(d.id,d.zone)){
            setDrag(null)
            return
        }
        // refused or dropped nowhere: the card flies back to where it came from
        const f=floatRef.current
        const r=d.src?.isConnected ? d.src.getBoundingClientRect() : null
        if(f&&r){
            f.classList.add('is-home')
            f.style.left=`${r.left+r.width/2}px`
            f.style.top=`${r.top+r.height/2}px`
            later(()=>setDrag(null),420)
        }
        else setDrag(null)
    }
    // near the top/bottom edge the sheet scrolls by itself, faster the closer you get
    const tick=()=>{
        raf.current=0
        const d=dragRef.current
        const sheet=sheetRef.current
        if(!d||!sheet) return
        const r=sheet.getBoundingClientRect()
        let v=0
        if(d.y<r.top+EDGE) v=-Math.min(1,(r.top+EDGE-d.y)/EDGE)                      // top edge, or above the list
        else if(d.armed&&d.y>r.bottom-EDGE&&d.y<r.bottom) v=Math.min(1,(d.y-(r.bottom-EDGE))/EDGE) // not on the way up from the hand
        const canUp=sheet.scrollTop>0
        const canDown=sheet.scrollTop+sheet.clientHeight<sheet.scrollHeight-1
        setEdge(`${canUp ? 'up' : ''}${canUp&&v<0 ? '-go' : ''} ${canDown ? 'down' : ''}${canDown&&v>0 ? '-go' : ''}`)
        if(v){
            const before=sheet.scrollTop
            sheet.scrollTop+=Math.sign(v)*(3+Math.abs(v)**2*20)
            if(sheet.scrollTop!==before){ d.key=''; moveDrag(d.x,d.y) }
        }
        raf.current=requestAnimationFrame(()=>api.current.tick())
    }


    // document listeners: set up once, they call the latest functions through api
    useEffect(()=>{
        const onMove=(e)=>{
            const p=press.current
            if(!p) return
            if(!p.started){
                const moved=Math.hypot(e.clientX-p.x,e.clientY-p.y)
                if(p.touch){
                    // moved before the hold finished: it's a scroll, not a pick-up
                    if(moved>10){ clearTimeout(p.timer); press.current=null }
                    return
                }
                if(moved>5){ p.started=true; api.current.startDrag(p.id,e.clientX,e.clientY,p.src) }
                return
            }
            api.current.moveDrag(e.clientX,e.clientY)
        }
        const onUp=()=>{
            const p=press.current
            if(!p) return
            clearTimeout(p.timer)
            press.current=null
            if(p.started){
                suppressClick.current=true // the click that follows a drop isn't a tap
                setTimeout(()=>{ suppressClick.current=false },0)
                api.current.endDrag()
            }
        }
        // a card in the air: the page must not scroll under the finger
        const onTouchMove=(e)=>{ if(press.current?.started) e.preventDefault() }
        // a mouse wheel or trackpad scrolls the sheet mid-drag
        const onWheel=(e)=>{
            const d=dragRef.current
            if(!d||!sheetRef.current) return
            e.preventDefault()
            sheetRef.current.scrollTop+=e.deltaY
            d.key=''
            api.current.moveDrag(d.x,d.y)
        }
        document.addEventListener('pointermove',onMove)
        document.addEventListener('pointerup',onUp)
        document.addEventListener('pointercancel',onUp)
        document.addEventListener('touchmove',onTouchMove,{passive:false})
        document.addEventListener('wheel',onWheel,{passive:false})
        const pending=timers.current
        return ()=>{
            document.removeEventListener('pointermove',onMove)
            document.removeEventListener('pointerup',onUp)
            document.removeEventListener('pointercancel',onUp)
            document.removeEventListener('touchmove',onTouchMove)
            document.removeEventListener('wheel',onWheel)
            cancelAnimationFrame(raf.current)
            clearTimeout(press.current?.timer)
            pending.forEach(clearTimeout)
        }
    },[])

    const onCardDown=(e,id)=>{
        if(e.button>0||pile?.phase==='closing') return
        const p={id,x:e.clientX,y:e.clientY,src:e.currentTarget,touch:e.pointerType!=='mouse',started:false}
        if(p.touch){
            p.timer=setTimeout(()=>{
                if(press.current!==p) return
                p.started=true
                api.current.startDrag(p.id,p.x,p.y,p.src)
            },HOLD_MS)
        }
        press.current=p
    }

    // ---- tapping (and the keyboard: Enter/Space click a card) ----
    const onCardClick=(e,id)=>{
        if(suppressClick.current) return
        id=String(id)
        const inPile=e.currentTarget.closest('[data-pk]')
        if(inPile){
            // a card in the open pile: a held hand card replaces it, otherwise bring it to the front to read it
            if(held&&held!==id&&positionOf(xi,held)===-1){
                if(commit(held,{kind:'pile',i:Number(inPile.dataset.pile),k:Number(inPile.dataset.pk)})) setHeld(null)
            }
            else setFocus(f=>f===id ? null : id)
            return
        }
        if(!held||held===id){
            setHeld(held===id ? null : id)
            if(held!==id) tell(positionOf(xi,id)>-1 ? 'Now tap another number or player to swap, or your hand to take him out.' : "Now tap a number. Tap a player's right edge to make a backup.")
            return
        }
        const at=positionOf(xi,id)
        const heldAt=positionOf(xi,held)
        if(at>-1){
            // tapped a player on the sheet while holding a card: swap, or back him up if you tapped his right edge
            const r=e.currentTarget.getBoundingClientRect()
            const tuck=heldAt===-1&&e.clientX>0&&e.clientX>r.right-r.width*.3
            if(commit(held,{kind:tuck ? 'tuck' : 'swap',i:at})) setHeld(null)
        }
        else if(heldAt>-1){
            // holding a starter, tapped a card in the hand: the hand card takes his place
            if(commit(id,{kind:'swap',i:heldAt})) setHeld(null)
        }
        else setHeld(id)
    }
    const onSpotClick=(i)=>{
        if(!held) return
        if(commit(held,{kind:'place',i})) setHeld(null)
    }
    const onHandClick=(e)=>{
        if(e.target.closest('[data-card]')||!held||positionOf(xi,held)===-1) return
        commit(held,{kind:'hand'})
        setHeld(null)
    }
    // turn a player's backup pile over (one at a time), or back
    const togglePile=(i)=>{
        if(pile?.phase==='closing') return
        setFocus(null)
        buzz()
        if(pile?.i===i){
            setPile({i,phase:'closing'})
            later(()=>setPile(p=>p?.phase==='closing' ? null : p),720)
            return
        }
        setPile({i,phase:'opening'})
        later(()=>setPile(p=>p?.i===i&&p.phase==='opening' ? {i,phase:'open'} : p),1100)
        setAnnounce(`${byId[xi[i].player]?.name}'s backups, turned face up`)
    }
    useEffect(()=>{ api.current={startDrag,moveDrag,endDrag,tick,togglePile} })

    const cardProps=(id)=>({
        'data-card':id,
        onPointerDown:(e)=>onCardDown(e,id),
        onClick:(e)=>onCardClick(e,id),
        onContextMenu:(e)=>e.preventDefault()
    })

    // ---- the popup itself: focus, Esc, no page scroll behind it ----
    useEffect(()=>{
        const opener=document.activeElement
        closeRef.current?.focus()
        const overflow=document.body.style.overflow
        document.body.style.overflow='hidden'
        return ()=>{
            document.body.style.overflow=overflow
            if(opener&&typeof opener.focus==='function') opener.focus()
        }
    },[])
    useEffect(()=>{
        const onKey=(e)=>{
            if(e.key!=='Escape') return
            e.preventDefault()
            if(held) setHeld(null)
            else if(pile&&pile.phase!=='closing') api.current.togglePile(pile.i)
            else onClose()
        }
        document.addEventListener('keydown',onKey)
        return ()=>document.removeEventListener('keydown',onKey)
    },[pile,held,onClose])

    // ---- what to show ----
    const dragging=drag ? byId[drag.id] : null
    const previewing=Boolean(drag&&hover?.plan?.ok)
    const shown=previewing ? applyDrop(xi,drag.id,hover.zone) : xi
    const osNow=overseasStarters(xi,byId,homeCountry)
    const incomingOs=Boolean(dragging&&positionOf(xi,drag.id)===-1&&isOs(dragging))
    const refusedOs=Boolean(hover?.plan?.overseas)
    const nearI=drag&&hover&&hover.zone.i!==undefined&&hover.zone.kind!=='unback' ? hover.zone.i : null
    const backing=['tuck','pile','pileAdd'].includes(hover?.zone.kind)
    const nearClass=hover?.plan ? (hover.plan.ok ? `act-${backing ? 'tuck' : 'swap'}` : 'act-no') : ''
    const toHand=hover&&(hover.zone.kind==='hand'||hover.zone.kind==='unback')

    // the turned-over pile, in the player's row
    const renderPile=(slot,i,p)=>(
        <div className={`xi-deck ${pile.phase==='opening' ? 'is-anim' : ''}`} data-deck={i} style={{'--n':Math.max(1,slot.backups.length)}}>
            {slot.backups.length>0
                ? slot.backups.map((b,k)=>{
                    const q=byId[b]
                    if(!q) return null
                    const target=hover?.zone.kind==='pile'&&hover.zone.i===i&&hover.zone.k===k&&hover.plan?.ok
                    return (
                        <div key={`dk-${b}`} data-pk={k} data-pile={i} style={{'--k':k}}
                            className={`xi-dk ${focus===b ? 'is-focus' : ''} ${fx.pileLanded===b ? 'is-landed' : ''} ${target ? 'is-target' : ''}`}>
                            <span className="xi-dord" aria-hidden="true">{k+1}</span>
                            <div className="xi-pin">
                                <SheetCard player={q} overseas={isOs(q)} cardProps={cardProps(b)} className={drag?.id===b ? 'xi-ghost' : ''} />
                                <span className="xi-pback xi-stripes" aria-hidden="true" />
                            </div>
                        </div>
                    )
                })
                : (
                    <button type="button" className="xi-dempty" onClick={()=>{ if(held&&commit(held,{kind:'pileAdd',i})) setHeld(null) }}>
                        Drop a card here to back up {lastName(p.name)}
                    </button>
                )}
            <button type="button" className="xi-dstrip xi-stripes" onClick={()=>togglePile(i)} aria-label={`Turn ${p.name} back over`}>
                {lastName(p.name)} ↺
            </button>
            {pile.phase==='closing' && <div className="xi-dface" aria-hidden="true"><SheetCard player={p} overseas={isOs(p)} cardProps={{tabIndex:-1}} /></div>}
            {tag(i)}
        </div>
    )

    const tag=(i)=>nearI===i&&hover.plan
        ? <span className={`xi-tag ${hover.plan.ok ? '' : 'is-no'}`}>{hover.plan.label}</span>
        : null

    return createPortal(
        <div ref={rootRef} className={`xi-root ${drag ? 'is-dragging' : ''}`} style={rootStyle}>
            <div className="xi-scrim">
                <div className="xi-pop" role="dialog" aria-modal="true" aria-labelledby="xi-title">
                    <div className="xi-head">
                        <div>
                            <h2 id="xi-title">Arrange your XI</h2>
                            <p>Drag a card onto a number. Drop it on a player to swap, or on his right edge to make a backup. Press and hold on a phone. Tapping works too.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={`xi-saved ${saveState==='saved' ? 'is-saved' : ''} ${saveState==='error' ? 'is-error' : ''}`} aria-live="polite">{SAVE_TEXT[saveState]}</span>
                            <button ref={closeRef} type="button" className="xi-x" aria-label="Close" onClick={onClose}>×</button>
                        </div>
                    </div>

                    <XiMeters bal={balance(shown,byId)} preview={previewing} overseas={overseasStarters(shown,byId,homeCountry)}
                        ghost={incomingOs&&!refusedOs&&osNow<XI_OVERSEAS_MAX} shake={shake||(refusedOs ? 1 : 0)} />

                    <div className="xi-sheet-box">
                        <div ref={sheetRef} className="xi-sheet" data-sheet>
                            <ol className="xi-slots">
                                {xi.map((slot,i)=>{
                                    const p=slot.player ? byId[slot.player] : null
                                    const near=nearI===i
                                    const names=slot.backups.map(b=>byId[b]?.name).filter(Boolean)
                                    const open=p&&pile?.i===i
                                    return (
                                        <li key={`slot-${i}`} data-slot={i} className={`xi-slot ${p ? 'has-player' : ''} ${near ? `is-near ${nearClass}` : ''} ${open&&pile.phase==='closing' ? 'is-closing' : ''}`}>
                                            <span className="xi-num">{i+1}</span>
                                            {open ? renderPile(slot,i,p) : p
                                                ? (
                                                    <div className="xi-spot is-filled" data-spot={i}>
                                                        {slot.backups.length>0 && (
                                                            <button type="button" className="xi-peekbtn" onClick={()=>togglePile(i)} aria-label={`Turn over ${p.name}'s backups`} />
                                                        )}
                                                        <span className="xi-peeks" aria-hidden="true">
                                                            {slot.backups.slice(0,3).map(b=><span key={`peek-${b}`} className="xi-peek" />)}
                                                        </span>
                                                        <SheetCard key={`card-${p._id}`} player={p} overseas={isOs(p)} cardProps={cardProps(String(p._id))}
                                                            className={[
                                                                drag?.id===String(p._id) ? 'xi-ghost' : '',
                                                                held===String(p._id) ? 'xi-held' : '',
                                                                fx.landed===String(p._id) ? 'is-landed' : '',
                                                                fx.flip&&fx.flip===String(p._id) ? 'is-flip' : ''
                                                            ].join(' ')} />
                                                        <span className="xi-tuck" aria-hidden="true">Back up</span>
                                                        <button type="button" className={`xi-bktag ${names.length ? '' : 'is-none'}`} onClick={()=>togglePile(i)}
                                                            aria-label={names.length ? `Backups for number ${i+1}: ${names.join(', ')}. Turn them over` : `Add a backup for number ${i+1}`}>
                                                            {names.length
                                                                ? <><em>BACKUP</em><span>{names.map(lastName).join(' · ')}</span>✎</>
                                                                : '+ Backup'}
                                                        </button>
                                                        {tag(i)}
                                                        {fx.ripple===i && <span key={`ripple-${fx.seq}`} className="xi-ripple" />}
                                                    </div>
                                                )
                                                : (
                                                    <button type="button" className="xi-spot" data-spot={i} onClick={()=>onSpotClick(i)}
                                                        aria-label={held ? `Put ${byId[held]?.name} at ${i+1}` : `Number ${i+1}, open`}>
                                                        {held ? 'Bat here' : 'Open'}
                                                        {tag(i)}
                                                        {fx.ripple===i && <span key={`ripple-${fx.seq}`} className="xi-ripple" />}
                                                    </button>
                                                )}
                                        </li>
                                    )
                                })}
                            </ol>
                        </div>
                        <div className={`xi-edge is-up ${edge.includes('up') ? 'is-on' : ''} ${edge.includes('up-go') ? 'is-go' : ''}`} aria-hidden="true"><span>▲ Scroll up</span></div>
                        <div className={`xi-edge is-down ${edge.includes('down') ? 'is-on' : ''} ${edge.includes('down-go') ? 'is-go' : ''}`} aria-hidden="true"><span>▼ Scroll down</span></div>
                    </div>

                    <div className="xi-hand-wrap" data-hand onClick={onHandClick}>
                        <div className="xi-hand-head">
                            <b>Your hand</b>
                            <small>{hand.length ? `${hand.length} not starting · drag a card back here to take a player out` : squad.length ? 'Everyone is in the XI' : ''}</small>
                        </div>
                        <div className={`xi-hand ${toHand ? 'is-return' : ''}`} aria-label="Players not in the XI">
                            {hand.length===0
                                ? <div className="xi-empty-hand">{squad.length ? `All ${squad.length} of your players are on the sheet.` : "You haven't bought anyone yet. Players you win land here."}</div>
                                : hand.map((p,k)=>{
                                    const mid=(hand.length-1)/2
                                    const id=String(p._id)
                                    return (
                                        <div key={`hand-${id}`} className="xi-hc" style={{'--r':`${((k-mid)*2.2).toFixed(1)}deg`,'--y':`${(Math.abs(k-mid)*3).toFixed(1)}px`}}>
                                            <HandCard player={p} overseas={isOs(p)} backupFor={backingUp(xi,id)} cardProps={cardProps(id)}
                                                className={`${drag?.id===id ? 'xi-ghost' : ''} ${held===id ? 'xi-held' : ''}`} />
                                        </div>
                                    )
                                })}
                        </div>
                        {toHand&&hover.plan && <span className="xi-tag xi-hand-tag">{hover.plan.label}</span>}
                    </div>

                    {say && <div key={say.seq} className={`xi-say ${say.bad ? 'is-bad' : ''}`} role="status">{say.text}</div>}

                    <div className="sr-only" aria-live="assertive">{announce}</div>
                </div>
            </div>

            {drag&&dragging && (
                <div ref={floatRef} className="xi-float" style={{left:drag.x,top:drag.y}} aria-hidden="true">
                    {positionOf(xi,drag.id)>-1
                        ? <div style={{width:300}}><SheetCard player={dragging} overseas={isOs(dragging)} cardProps={{tabIndex:-1}} /></div>
                        : <HandCard player={dragging} overseas={isOs(dragging)} backupFor={backingUp(xi,drag.id)} cardProps={{tabIndex:-1}} />}
                </div>
            )}
        </div>,
        document.body
    )
}

export default XiBuilder
