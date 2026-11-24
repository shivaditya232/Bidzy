import { useEffect, useRef, useState } from 'react'
import Button from '../ui/Button'
import { SheetCard, CardPhoto } from './XiCards'
import { addBackup, removeBackup, moveBackup, backingUp, lastName, ROLE_SHORT, ROLE_BAND, ROLE_COLOUR, powerStat } from '../../utils/xi'

// See and change who backs up one position: put them in order, take them off, add more from the hand.
// Sits inside the XI builder (it shares its team colours); Esc is handled by the builder.
//   i: the position (0-based)   hand: players not starting   onChange(nextLineup)
function BackupsPopup({ i, lineup, byId, hand, isOs, onChange, onClose }) {
    const doneRef=useRef(null)
    const [moved,setMoved]=useState(null) // the row that just moved, for a little snap
    const slot=lineup[i]
    const starter=byId[slot.player]

    useEffect(()=>{ doneRef.current?.focus() },[])

    if(!starter) return null
    const bench=hand.filter(p=>!slot.backups.includes(String(p._id)))

    const change=(next,id)=>{
        setMoved(id)
        onChange(next)
    }

    return (
        <div className="xi-bkscrim" onMouseDown={(e)=>{ if(e.target===e.currentTarget) onClose() }}>
            <div className="xi-bkpop" role="dialog" aria-modal="true" aria-labelledby="xi-bk-title">
                <div className="xi-bktop">
                    <div>
                        <h3 id="xi-bk-title">Backups for #{i+1}</h3>
                        <p>If {lastName(starter.name)} can't play, the first backup comes in.</p>
                    </div>
                    <button type="button" className="xi-x" aria-label="Close" onClick={onClose}>×</button>
                </div>
                <div className="xi-bkstarter"><SheetCard player={starter} overseas={isOs(starter)} cardProps={{tabIndex:-1,'aria-hidden':true}} /></div>

                <div className="xi-bkbody">
                    <div className="xi-bklabel">In order</div>
                    {slot.backups.length===0
                        ? <div className="xi-bkempty">No backup yet. Tap a player below.</div>
                        : (
                            <ol className="xi-bklist">
                                {slot.backups.map((id,k)=>{
                                    const p=byId[id]
                                    if(!p) return null
                                    const also=backingUp(lineup,id).filter(n=>n!==i+1)
                                    return (
                                        <li key={id} className={`xi-bkrow ${moved===id ? 'is-moved' : ''}`} style={{'--rc':ROLE_COLOUR[p.role]}}>
                                            <span className="xi-ord">{k+1}</span>
                                            <CardPhoto player={p} />
                                            <span className="min-w-0">
                                                <b>{p.name}</b>
                                                <small>{k===0 ? 'First in' : 'Next in'} · {ROLE_SHORT[p.role]}{isOs(p) ? ' · OS' : ''}{also.length ? ` · also #${also.join(', #')}` : ''}</small>
                                            </span>
                                            <span className="xi-acts">
                                                <button type="button" className="xi-ib" disabled={k===0} aria-label={`Move ${p.name} up`}
                                                    onClick={()=>change(moveBackup(lineup,i,k,-1),id)}>▲</button>
                                                <button type="button" className="xi-ib" disabled={k===slot.backups.length-1} aria-label={`Move ${p.name} down`}
                                                    onClick={()=>change(moveBackup(lineup,i,k,1),id)}>▼</button>
                                                <button type="button" className="xi-ib is-remove" aria-label={`Remove ${p.name} as backup`}
                                                    onClick={()=>change(removeBackup(lineup,i,id),null)}>✕</button>
                                            </span>
                                        </li>
                                    )
                                })}
                            </ol>
                        )}

                    <div className="xi-bklabel">Add from your hand</div>
                    {bench.length===0
                        ? <div className="xi-bkempty">{hand.length ? 'Everyone in your hand already backs him up.' : 'Nobody in your hand. Buy more players or take one out of the XI.'}</div>
                        : (
                            <div className="xi-benches">
                                {bench.map(p=>{
                                    const stat=powerStat(p)
                                    const also=backingUp(lineup,p._id)
                                    return (
                                        <button key={p._id} type="button" className="xi-bench" style={{'--rc':ROLE_COLOUR[p.role]}} aria-label={`Add ${p.name} as backup`}
                                            onClick={()=>change(addBackup(lineup,i,p._id),String(p._id))}>
                                            <span className="xi-band">{ROLE_BAND[p.role]}</span>
                                            <b>{p.name.split(' ').map((word,w)=><span key={`w-${w}`} className="block">{word}</span>)}</b>
                                            <small>{stat.label} {stat.value}{also.length ? ` · #${also.join(',#')}` : ''}</small>
                                            <span className="xi-plus" aria-hidden="true">+</span>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                </div>

                <div className="xi-bkfoot">
                    <Button ref={doneRef} kind="primary" size="sm" onClick={onClose}>Done</Button>
                </div>
            </div>
        </div>
    )
}

export default BackupsPopup
