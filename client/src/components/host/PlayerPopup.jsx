import { useCallback, useState } from 'react'
import Popup from '../ui/Popup'
import PhotoCrop from './PhotoCrop'
import PhotoCredit from '../ui/PhotoCredit'
import Field from '../ui/Field'
import Button from '../ui/Button'
import { createPlayer, updatePlayer, deletePlayer } from '../../api/host'
import { errorMessage } from '../../api/axios'
import { formatMoney } from '../../utils/money'
import { hasErrors } from '../../utils/validate'
import { initials, statsFor } from '../../utils/board'
import { ROLE_SHORT, ROLE_COLOUR } from '../../utils/xi'
import { BASE_PRICES, ROLES, STAT_FIELDS, emptyPlayerForm, playerToForm, validatePlayer, playerPayload } from '../../utils/host'

const selectClass='h-12 w-full rounded-xl border border-line bg-white/[.04] px-3 font-text text-[16px] text-fg outline-none focus:border-white/35 [&>option]:bg-night-2'

// Add a player, or edit one (player given). Only players not yet auctioned can be removed.
//   onSaved(): reload the list
function PlayerPopup({ roomId, player, sets, defaultSetId, onSaved, onClose }) {
    const editing=Boolean(player)
    const [form,setForm]=useState(()=>editing ? playerToForm(player) : emptyPlayerForm(defaultSetId||sets[0]?._id||''))
    const [submitted,setSubmitted]=useState(false)
    const [busy,setBusy]=useState(false)
    const [serverError,setServerError]=useState('')
    const [confirmDelete,setConfirmDelete]=useState(false)

    const errors=validatePlayer(form)
    const errorFor=(field)=>submitted ? errors[field] : undefined
    const set=(field)=>(e)=>{ setForm(prev=>({...prev,[field]:e.target.value})); setServerError('') }
    const setStat=(key)=>(e)=>setForm(prev=>({...prev,stats:{...prev.stats,[key]:e.target.value}}))
    // a newly chosen (or removed) photo drops the old photo's credit; moving the crop keeps it
    const setPhoto=useCallback((image,{fresh})=>{
        setForm(prev=>fresh ? {...prev,image,source:null,credit:''} : {...prev,image})
        setServerError('')
    },[])

    const save=async(e)=>{
        e.preventDefault()
        setSubmitted(true)
        if(hasErrors(errors)) return
        setBusy(true)
        try{
            if(editing) await updatePlayer(roomId,player._id,playerPayload(form))
            else await createPlayer(roomId,playerPayload(form))
            onSaved(editing ? 'Player saved' : `${form.name.trim()} added`)
            onClose()
        }
        catch(err){
            setServerError(errorMessage(err))
            setBusy(false)
        }
    }

    const remove=async()=>{
        setBusy(true)
        try{
            await deletePlayer(roomId,player._id)
            onSaved(`${player.name} removed`)
            onClose()
        }
        catch(err){
            setServerError(errorMessage(err))
            setBusy(false)
            setConfirmDelete(false)
        }
    }

    const canRemove=editing&&player.status==='pending'

    return (
        <Popup open onClose={onClose} title={editing ? 'Edit player' : 'Add a player'} wide="xl">
            <form className="grid gap-3.5 text-fg" onSubmit={save} noValidate>
              <div className="grid items-start gap-[18px] min-[681px]:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
                <div className="grid gap-3.5">
                    <PhotoCrop image={form.image} onChange={setPhoto} label={form.name.trim()||'the player'} />
                    {form.source
                        ? <PhotoCredit credit={form.source} className="rounded-[10px] bg-white/[.03] px-2.5 py-2" />
                        : form.image && (
                            <Field id="player-credit" label="Photo credit (optional)" value={form.credit} onChange={set('credit')} error={errorFor('credit')}
                                hint="Who took it. Shown small under the photo." placeholder="Photo by…" autoComplete="off" maxLength={160} />
                        )}
                    <div className="grid gap-1.5">
                        <span className="text-sm font-semibold">How the card looks</span>
                        <CardPreview form={form} />
                    </div>
                </div>

                <div className="grid gap-3.5">
                {player?.roleGuessed && (
                    <p className="m-0 rounded-xl border border-dashed border-[#F6C24A]/60 px-3.5 py-2.5 text-[13px] text-[#FFE3A3]">
                        No Wikipedia page for {player.name}, so the role was guessed from the bowling style. Check it.
                    </p>
                )}
                <Field id="player-name" label="Name" value={form.name} onChange={set('name')} error={errorFor('name')} placeholder="Shubman Gill" autoComplete="off" maxLength={60} />

                <div className="grid gap-1.5">
                    <span id="player-role-label" className="text-sm font-semibold">Role</span>
                    <div role="radiogroup" aria-labelledby="player-role-label" className="flex flex-wrap gap-1.5">
                        {ROLES.map(role=>(
                            <button key={role} type="button" role="radio" aria-checked={form.role===role} onClick={()=>setForm(prev=>({...prev,role}))}
                                className={`cursor-pointer rounded-full border px-3 py-1.5 font-text text-[13px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg
                                    ${form.role===role ? 'border-floodlight bg-floodlight/[.08] text-fg' : 'border-white/15 bg-transparent text-fg-2 hover:border-white/30'}`}>
                                {role}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                    <Field id="player-country" label="Country" value={form.country} onChange={set('country')} error={errorFor('country')} autoComplete="off" />
                    <div className="grid gap-1.5">
                        <label htmlFor="player-base" className="text-sm font-semibold">Base price</label>
                        <select id="player-base" className={selectClass} value={form.basePrice} onChange={e=>setForm(prev=>({...prev,basePrice:Number(e.target.value)}))}>
                            {BASE_PRICES.map(p=><option key={p} value={p}>{formatMoney(p)}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid gap-1.5">
                    <label htmlFor="player-set" className="text-sm font-semibold">Set</label>
                    <select id="player-set" className={selectClass} value={form.set} onChange={set('set')} aria-invalid={errorFor('set') ? true : undefined}>
                        {sets.map(s=><option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                    {errorFor('set') && <span className="text-[13px] text-alert">{errorFor('set')}</span>}
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    {STAT_FIELDS[form.role].map(([key,label])=>(
                        <Field key={key} id={`player-${key}`} label={label} inputMode="decimal" value={form.stats[key]??''} onChange={setStat(key)} error={errorFor(key)} placeholder="0" />
                    ))}
                </div>

                {errorFor('image') && <span className="text-[13px] text-alert">{errorFor('image')}</span>}
                </div>
              </div>

                {serverError && <p role="alert" className="m-0 rounded-xl bg-alert/10 px-3.5 py-2.5 text-sm text-alert">{serverError}</p>}

                {confirmDelete
                    ? (
                        <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-alert/40 bg-alert/[.06] px-3.5 py-2.5">
                            <span className="text-sm">Remove {player.name} from this auction?</span>
                            <span className="flex gap-2">
                                <Button kind="secondary" size="sm" onClick={()=>setConfirmDelete(false)}>Keep</Button>
                                <Button kind="danger" size="sm" aria-busy={busy} onClick={remove}>Remove</Button>
                            </span>
                        </div>
                    )
                    : (
                        <div className="flex flex-wrap items-center justify-between gap-2.5">
                            {canRemove ? <Button kind="quiet" onClick={()=>setConfirmDelete(true)} className="text-alert!">Remove player</Button> : <span />}
                            <span className="flex gap-2">
                                <Button kind="secondary" size="sm" onClick={onClose}>Cancel</Button>
                                <Button kind="primary" size="sm" type="submit" aria-busy={busy}>{busy ? 'Saving…' : editing ? 'Save' : 'Add player'}</Button>
                            </span>
                        </div>
                    )}
            </form>
        </Popup>
    )
}

// the player as a card in the house colours: photo (or initials), name, role and the headline number
function CardPreview({ form }) {
    const [,first]=statsFor({role:form.role,stats:Object.fromEntries(Object.entries(form.stats||{}).map(([k,v])=>[k,Number(v)||0]))})
    return (
        <div className="bz-card-preview">
            {form.image
                ? <img src={form.image} alt="" className="size-16 rounded-xl object-cover object-[50%_15%]" />
                : <span className="grid size-16 place-items-center rounded-xl bg-black/25 font-num text-[22px] font-black" aria-hidden="true">{initials(form.name||'?')}</span>}
            <span className="min-w-0">
                <b className="block truncate font-num text-[22px] leading-none font-black uppercase">{form.name.trim()||'New player'}</b>
                <span className="mt-1 inline-block rounded-[5px] px-1.5 pt-px text-[10px] font-extrabold tracking-[.1em] text-[#0A0D12]" style={{background:ROLE_COLOUR[form.role]}}>{ROLE_SHORT[form.role]}</span>
            </span>
            {first && (
                <span className="text-right font-num text-[22px] leading-[.9] font-black text-[#FFE7A0]">
                    {first[1]}<small className="block font-text text-[9px] font-extrabold tracking-[.12em] text-white/70">{first[0]}</small>
                </span>
            )}
        </div>
    )
}

export default PlayerPopup
