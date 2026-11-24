import { useState } from 'react'
import Popup from '../ui/Popup'
import Field from '../ui/Field'
import Button from '../ui/Button'
import { createSet, reorderSets, deleteSet } from '../../api/host'
import { errorMessage } from '../../api/axios'

const arrow='grid size-8 cursor-pointer place-items-center rounded-lg border border-white/15 bg-transparent text-fg-2 hover:border-white/30 hover:text-fg disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-fg'

// The order sets go under the hammer, plus adding a set and removing an empty one.
//   groups: [{set, players}] in the current order. onChanged(): reload
function SetsPopup({ roomId, groups, onChanged, onClose }) {
    const [order,setOrder]=useState(()=>groups.map(g=>g.set))
    const [name,setName]=useState('')
    const [error,setError]=useState('')
    const [busy,setBusy]=useState(false)
    const counts=Object.fromEntries(groups.map(g=>[g.set._id,g.players.length]))

    const run=async(work)=>{
        setBusy(true)
        setError('')
        try{ await work(); onChanged() }
        catch(err){ setError(errorMessage(err)) }
        setBusy(false)
    }

    const move=(i,step)=>{
        const next=[...order]
        ;[next[i],next[i+step]]=[next[i+step],next[i]]
        setOrder(next)
        run(()=>reorderSets(roomId,next.map(s=>s._id)))
    }

    const add=(e)=>{
        e.preventDefault()
        const trimmed=name.trim()
        if(!trimmed){ setError('Name the set'); return }
        run(async()=>{
            const created=await createSet(roomId,trimmed)
            setOrder(prev=>[...prev,created])
            setName('')
        })
    }

    const remove=(set)=>run(async()=>{
        await deleteSet(roomId,set._id)
        setOrder(prev=>prev.filter(s=>s._id!==set._id))
    })

    return (
        <Popup open onClose={onClose} title="Order of sets" wide>
            <p className="m-0 mb-4">Players come up set by set, top to bottom.</p>
            <div className="grid gap-3.5 text-fg">
                <ol className="m-0 grid list-none gap-1.5 p-0">
                    {order.map((set,i)=>(
                        <li key={set._id} className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-xl bg-white/[.03] px-2.5 py-2">
                            <span className="text-center font-num text-lg font-extrabold text-fg-3">{i+1}</span>
                            <span className="min-w-0"><b className="block truncate font-semibold">{set.name}</b><small className="text-xs text-fg-3">{counts[set._id]||0} {(counts[set._id]||0)===1 ? 'player' : 'players'}</small></span>
                            <span className="flex gap-1.5">
                                <button type="button" className={arrow} disabled={busy||i===0} onClick={()=>move(i,-1)} aria-label={`Move ${set.name} up`}>↑</button>
                                <button type="button" className={arrow} disabled={busy||i===order.length-1} onClick={()=>move(i,1)} aria-label={`Move ${set.name} down`}>↓</button>
                                {!counts[set._id] && <button type="button" className={`${arrow} hover:text-alert`} disabled={busy} onClick={()=>remove(set)} aria-label={`Remove ${set.name}`}>×</button>}
                            </span>
                        </li>
                    ))}
                </ol>
                <form className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2" onSubmit={add} noValidate>
                    <Field id="new-set" label="New set" value={name} onChange={e=>{ setName(e.target.value); setError('') }} placeholder="Uncapped Set 1" autoComplete="off" maxLength={40} />
                    <Button kind="secondary" size="sm" type="submit" disabled={busy} className="h-12">Add</Button>
                </form>
                {error && <p role="alert" className="m-0 rounded-xl bg-alert/10 px-3.5 py-2.5 text-sm text-alert">{error}</p>}
            </div>
        </Popup>
    )
}

export default SetsPopup
