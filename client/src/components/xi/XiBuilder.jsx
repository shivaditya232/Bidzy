import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import XiMeters from './XiMeters'
import BackupsPopup from './BackupsPopup'
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
// Tapping works too (tap a card, then a number), and the backup tag under each player opens his backups.
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
    const [backupsFor,setBackupsFor]=useState(null)
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

    const later=(fn,ms)=>{ timers.current.push(setTimeout(fn,ms)) }
    const tell=(text,bad=false)=>{
        const seq=Date.now()
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
                const seq=Date.now()
                setShake(seq)
                later(()=>setShake(v=>v===seq ? 0 : v),600)
            }
            return false
        }
        const there=zone.kind!=='hand' ? xi[zone.i].player : null
        const name=byId[id]?.name
        onChange(applyDrop(xi,id,zone))
        const seq=Date.now()
        if(zone.kind==='hand'){ tell(`${name} back to your hand`); setAnnounce(`${name} back to your hand`) }
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
        if(el?.closest('[data-hand]')) return {kind:'hand'}
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
        dragRef.current={id,x,y,lx:x,key:'',zone:null,src,armed:Boolean(src.closest('[data-sheet]'))}
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
        const key=zone ? `${zone.kind}${zone.i??''}` : ''
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

    useEffect(()=>{ api.current={startDrag,moveDrag,endDrag,tick} })

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
        if(e.button>0||backupsFor!==null) return
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
    const cardProps=(id)=>({
        'data-card':id,
        onPointerDown:(e)=>onCardDown(e,id),
        onClick:(e)=>onCardClick(e,id),
        onContextMenu:(e)=>e.preventDefault()
    })

    // ---- the popup itself: focus, Esc, no page scroll behind it ----
    const closeBackups=useCallback(()=>setBackupsFor(null),[])
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
            if(backupsFor!==null) setBackupsFor(null)
            else if(held) setHeld(null)
            else onClose()
        }
        document.addEventListener('keydown',onKey)
        return ()=>document.removeEventListener('keydown',onKey)
    },[backupsFor,held,onClose])

    // ---- what to show ----
    const dragging=drag ? byId[drag.id] : null
    const previewing=Boolean(drag&&hover?.plan?.ok)
    const shown=previewing ? applyDrop(xi,drag.id,hover.zone) : xi
    const osNow=overseasStarters(xi,byId,homeCountry)
    const incomingOs=Boolean(dragging&&positionOf(xi,drag.id)===-1&&isOs(dragging))
    const refusedOs=Boolean(hover?.plan?.overseas)
    const nearI=drag&&hover&&hover.zone.kind!=='hand' ? hover.zone.i : null
    const nearClass=hover?.plan ? (hover.plan.ok ? `act-${hover.zone.kind==='tuck' ? 'tuck' : 'swap'}` : 'act-no') : ''

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
                                    return (
                                        <li key={`slot-${i}`} data-slot={i} className={`xi-slot ${p ? 'has-player' : ''} ${near ? `is-near ${nearClass}` : ''}`}>
                                            <span className="xi-num">{i+1}</span>
                                            {p
                                                ? (
                                                    <div className="xi-spot is-filled" data-spot={i}>
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
                                                        <button type="button" className={`xi-bktag ${names.length ? '' : 'is-none'}`} onClick={()=>setBackupsFor(i)}
                                                            aria-label={names.length ? `Backups for number ${i+1}: ${names.join(', ')}. Change` : `Add a backup for number ${i+1}`}>
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
                        <div className={`xi-hand ${hover?.zone.kind==='hand' ? 'is-return' : ''}`} aria-label="Players not in the XI">
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
                        {hover?.zone.kind==='hand'&&hover.plan && <span className="xi-tag xi-hand-tag">{hover.plan.label}</span>}
                    </div>

                    {say && <div key={say.seq} className={`xi-say ${say.bad ? 'is-bad' : ''}`} role="status">{say.text}</div>}

                    {backupsFor!==null&&xi[backupsFor]?.player && (
                        <BackupsPopup i={backupsFor} lineup={xi} byId={byId} hand={hand} isOs={isOs} onChange={onChange} onClose={closeBackups} />
                    )}
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
