import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Popup from './ui/Popup'
import Field from './ui/Field'
import Button from './ui/Button'
import { createRoom, roomHome } from '../api/rooms'
import { HOUSE_GLOW, CUSTOM_COLOURS } from '../utils/color'
import { useFranchises } from '../hooks/useFranchises'
import { validateCreateRoom, createRoomPayload } from '../utils/lobby'
import { hasErrors } from '../utils/validate'

const TYPES=[
    {value:'ipl',title:'IPL franchises',text:'Each team picks one of the 10. Up to 10 teams.'},
    {value:'custom',title:'Your own names',text:'Teams name themselves and pick a colour.'}
]

const unit=(text)=><span className="pr-2.5 text-sm text-fg-3">{text}</span>

// Create a room: a short form, then a ticket with the invite code to send your friends.
function CreateRoomPopup({ onClose, onCreated, onCopyCode }){
    const navigate=useNavigate()
    const { franchises }=useFranchises()
    const [form,setForm]=useState({name:'',type:'ipl',purseCr:'120',timerSeconds:'15',maxTeams:'10'})
    const [touched,setTouched]=useState({})
    const [submitted,setSubmitted]=useState(false)
    const [serverError,setServerError]=useState('')
    const [busy,setBusy]=useState(false)
    const [created,setCreated]=useState(null)

    const errors=validateCreateRoom(form)
    const errorFor=(field)=>(touched[field]||submitted) ? errors[field] : undefined

    const update=(field)=>(e)=>{
        setForm(prev=>({...prev,[field]:e.target.value}))
        setServerError('')
    }
    const leave=(field)=>()=>setTouched(prev=>({...prev,[field]:true}))

    const pickType=(type)=>{
        // only 10 franchises to go round
        setForm(prev=>({...prev,type,maxTeams:type==='ipl'&&Number(prev.maxTeams)>10 ? '10' : prev.maxTeams}))
    }

    const handleSubmit=async(e)=>{
        e.preventDefault()
        setSubmitted(true)
        if(hasErrors(errors)){
            const first=['name','purse','timer','maxTeams'].find(f=>errors[f])
            document.getElementById(`create-${first}`)?.focus()
            return
        }
        setBusy(true)
        try{
            const room=await createRoom(createRoomPayload(form))
            setCreated(room)
            onCreated()
        }
        catch(err){
            setServerError(err.response ? (err.response.data?.message||'Something went wrong. Try again.') : "Can't reach Bidzy right now. Check your connection and try again.")
        }
        setBusy(false)
    }

    if(created){
        const letters=created.inviteCode.split('')
        return (
            <Popup open onClose={onClose} title="Room ready" glow={HOUSE_GLOW} wide>
                <p className="m-0 mb-5">Send this code to your friends. They join with it.</p>
                <div className="bz-ticket grid gap-2.5 rounded-[18px] p-5 text-center">
                    <small className="text-[11px] font-bold tracking-[.18em] uppercase opacity-60">Admit teams to</small>
                    <div className="font-num text-2xl font-black [overflow-wrap:anywhere] uppercase">{created.name}</div>
                    <div className="-mx-5 my-1 border-t-2 border-dashed border-[#1A1407]/25" aria-hidden="true" />
                    <small className="text-[11px] font-bold tracking-[.18em] uppercase opacity-60">Invite code</small>
                    <div className="flex justify-center gap-1.5 [perspective:400px]" aria-label={`Invite code ${letters.join(' ')}`} role="img">
                        {letters.map((letter,i)=>(
                            <span
                                key={i}
                                aria-hidden="true"
                                className="bz-flip grid h-[clamp(48px,14vw,66px)] w-[clamp(36px,11vw,52px)] place-items-center rounded-[10px] bg-[#1A1407] font-num text-[clamp(28px,8vw,40px)] font-black text-floodlight"
                                style={{animationDelay:`${0.15+i*0.09}s`}}
                            >
                                {letter}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                    <Button kind="secondary" autoFocus onClick={()=>onCopyCode(created.inviteCode)}>Copy code</Button>
                    <Button kind="primary" arrow onClick={()=>navigate(roomHome(created._id,'host'))}>Open room</Button>
                </div>
            </Popup>
        )
    }

    const swatches={
        ipl:franchises.slice(0,5).map(f=>f.glow?.p||f.primary),
        custom:CUSTOM_COLOURS.slice(0,5)
    }

    return (
        <Popup open onClose={onClose} title="New room" glow={HOUSE_GLOW} wide>
            <p className="m-0 mb-5">You host. Friends join with the code you get.</p>
            <form className="grid gap-4 text-fg" onSubmit={handleSubmit} noValidate>
                <Field id="create-name" label="Room name" value={form.name} onChange={update('name')} onBlur={leave('name')}
                    error={errorFor('name')} placeholder="CSE Batch Auction" autoComplete="off" maxLength={60} />

                <div className="grid gap-1.5">
                    <span id="create-type-label" className="text-sm font-semibold">Teams are</span>
                    <div role="radiogroup" aria-labelledby="create-type-label" className="grid grid-cols-2 gap-2.5">
                        {TYPES.map(type=>{
                            const on=form.type===type.value
                            return (
                                <button
                                    key={type.value}
                                    type="button"
                                    role="radio"
                                    aria-checked={on}
                                    onClick={()=>pickType(type.value)}
                                    className={`grid min-w-0 cursor-pointer content-start gap-2 rounded-[14px] border p-3.5 text-left font-text text-fg
                                        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg
                                        ${on ? 'border-floodlight bg-floodlight/[.06] ring-1 ring-floodlight ring-inset' : 'border-white/15 bg-night/50 hover:border-white/30'}`}
                                >
                                    <span className="flex gap-[3px]" aria-hidden="true">
                                        {swatches[type.value].map(c=><i key={c} className="size-3.5 rounded" style={{background:c}} />)}
                                    </span>
                                    <b className="font-num text-xl font-extrabold tracking-[.03em] uppercase">{type.title}</b>
                                    <small className="text-[13px] leading-snug text-fg-2">{type.text}</small>
                                </button>
                            )
                        })}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    <Field id="create-purse" label="Purse per team" inputMode="decimal" value={form.purseCr} onChange={update('purseCr')} onBlur={leave('purse')}
                        error={errorFor('purse')} after={unit('Cr')} className="col-span-2 sm:col-span-1" />
                    <Field id="create-timer" label="Bid timer" inputMode="numeric" value={form.timerSeconds} onChange={update('timerSeconds')} onBlur={leave('timer')}
                        error={errorFor('timer')} after={unit('sec')} />
                    <Field id="create-maxTeams" label="Max teams" inputMode="numeric" value={form.maxTeams} onChange={update('maxTeams')} onBlur={leave('maxTeams')}
                        error={errorFor('maxTeams')} />
                </div>

                <p className="m-0 border-t border-line pt-3 text-[13px] text-fg-2">
                    Squads of 19 to 25 players, 5 to 8 from overseas. You can change the rules in room settings before the auction starts.
                </p>

                {serverError && <p role="alert" className="m-0 rounded-xl bg-alert/10 px-3.5 py-2.5 text-sm text-alert">{serverError}</p>}

                <Button kind="primary" type="submit" arrow={!busy} className="w-full" aria-busy={busy}>
                    {busy ? 'Creating…' : 'Create room'}
                </Button>
            </form>
        </Popup>
    )
}

export default CreateRoomPopup
