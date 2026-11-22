import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Popup from './ui/Popup'
import Field from './ui/Field'
import Button from './ui/Button'
import { previewRoom, joinRoom, roomHome } from '../api/rooms'
import { HOUSE_GLOW, CUSTOM_COLOURS, deriveGlow, teamStyle } from '../utils/color'
import { useFranchises } from '../hooks/useFranchises'
import { cleanCode, CODE_LENGTH } from '../utils/lobby'

const EMPTY=Array(CODE_LENGTH).fill('')

// what was just typed into a box. one key -> one letter, but phone autofill can drop the whole code into one box,
// so several letters are kept and spread over the next boxes. the letter already there is dropped.
const typed=(value,old)=>old&&value.length>1&&value.startsWith(old) ? value.slice(old.length) : value

const readError=(err)=>{
    if(!err.response) return "Can't reach Bidzy right now. Check your connection and try again."
    if(err.response.status===404) return 'No room has that code. Check it with your host.'
    return err.response.data?.message||'Something went wrong. Try again.'
}

// Join a room: type the 6-letter code, then pick a franchise (IPL room) or a name and colour (custom room).
// The popup takes on your team's colours as soon as you pick.
// myRooms: your rooms from the lobby, to spot a code for a room you're already in.
function JoinRoomPopup({ onClose, myRooms }){
    const navigate=useNavigate()
    const { franchises, byCode }=useFranchises()
    const [letters,setLetters]=useState(EMPTY)
    const [lookup,setLookup]=useState({code:'',state:'idle'}) // the last answer: found | error, for `code`
    const [pick,setPick]=useState(null)        // IPL: franchise code
    const [teamName,setTeamName]=useState('')  // custom
    const [color,setColor]=useState(null)      // custom
    const [nameTouched,setNameTouched]=useState(false)
    const [tried,setTried]=useState(false)       // pressed Join with something missing
    const [joinError,setJoinError]=useState('')
    const [busy,setBusy]=useState(false)
    const boxes=useRef([])

    const code=letters.join('')
    const complete=code.length===CODE_LENGTH
    const alreadyIn=complete ? myRooms.find(r=>r.room.inviteCode===code) : null

    // look the room up as soon as all 6 letters are in
    useEffect(()=>{
        if(!complete||alreadyIn) return
        let cancelled=false
        previewRoom(code)
            .then(room=>{ if(!cancelled) setLookup({code,state:'found',room}) })
            .catch(err=>{ if(!cancelled) setLookup({code,state:'error',message:readError(err)}) })
        return ()=>{ cancelled=true }
    },[code,complete,alreadyIn])

    // fill from box `from` onwards (typing one letter, or pasting the whole code)
    const fill=(from,text)=>{
        const clean=cleanCode(text)
        if(!clean) return
        // build on the latest letters (prev), not this render's copy: fast typing can land two keys before a re-render
        setLetters(prev=>{
            const next=[...prev]
            clean.split('').forEach((ch,i)=>{ if(from+i<CODE_LENGTH) next[from+i]=ch })
            return next
        })
        setPick(null)
        setJoinError('')
        boxes.current[Math.min(from+clean.length,CODE_LENGTH-1)]?.focus()
    }

    const clearAt=(i)=>{
        setLetters(prev=>prev.map((ch,j)=>j===i ? '' : ch))
        setPick(null)
        setJoinError('')
    }

    const onKeyDown=(i)=>(e)=>{
        if(e.key==='Backspace'){
            e.preventDefault()
            if(e.currentTarget.value) clearAt(i)
            else if(i>0){
                clearAt(i-1)
                boxes.current[i-1]?.focus()
            }
        }
        else if(e.key==='ArrowLeft'&&i>0) boxes.current[i-1]?.focus()
        else if(e.key==='ArrowRight'&&i<CODE_LENGTH-1) boxes.current[i+1]?.focus()
    }

    // the answer only counts for the code that's in the boxes now
    const answer=complete&&!alreadyIn&&lookup.code===code ? lookup : null
    const checking=complete&&!alreadyIn&&!answer
    const room=answer?.state==='found' ? answer.room : null
    const closedReason=room&&room.status!=='lobby' ? 'This auction has already started, so it can\'t take new teams.'
        : room&&room.teamCount>=room.maxTeams ? 'This room is full.' : ''
    const isIpl=room?.type==='ipl'
    const taken=new Set(room?.takenFranchises||[])

    const glow=isIpl&&pick&&byCode[pick] ? byCode[pick].glow
        : !isIpl&&color ? deriveGlow(color)
        : HOUSE_GLOW

    const nameError=nameTouched&&!teamName.trim() ? 'Name your team' : undefined
    const ready=room&&!closedReason&&(isIpl ? Boolean(pick) : Boolean(teamName.trim()&&color))

    const handleJoin=async()=>{
        if(!ready){
            setNameTouched(true)
            setTried(true)
            return
        }
        setBusy(true)
        setJoinError('')
        try{
            const body=isIpl ? {inviteCode:code,franchise:pick} : {inviteCode:code,teamName:teamName.trim(),color}
            const result=await joinRoom(body)
            navigate(roomHome(result.room._id,'team'))
        }
        catch(err){
            setJoinError(readError(err))
            setBusy(false)
            // someone may have grabbed that franchise a moment ago: refresh what's taken
            if(isIpl){
                previewRoom(code).then(fresh=>setLookup({code,state:'found',room:fresh})).catch(()=>{})
                setPick(null)
            }
        }
    }

    const pickedName=isIpl&&pick ? byCode[pick]?.name : teamName.trim()

    return (
        <Popup open onClose={onClose} title="Join a room" glow={glow} wide>
            <p className="m-0 mb-5">Type the 6-letter code your host sent you.</p>

            <div className="grid gap-4 text-fg">
                <div className="grid grid-cols-6 gap-2" role="group" aria-label="Invite code">
                    {letters.map((letter,i)=>(
                        <input
                            key={i}
                            ref={el=>{ boxes.current[i]=el }}
                            value={letter}
                            onChange={e=>e.target.value ? fill(i,typed(e.target.value,letter)) : clearAt(i)}
                            onKeyDown={onKeyDown(i)}
                            onPaste={e=>{ e.preventDefault(); fill(i,e.clipboardData.getData('text')) }}
                            onFocus={e=>e.target.select()}
                            aria-label={`Letter ${i+1} of ${CODE_LENGTH}`}
                            autoComplete="off"
                            autoCapitalize="characters"
                            spellCheck={false}
                            inputMode="text"
                            className="aspect-[4/5] w-full min-w-0 rounded-xl border border-white/15 bg-night/60 p-0 text-center font-num text-[clamp(26px,7vw,36px)] font-black text-floodlight uppercase
                                outline-none focus:border-transparent focus:ring-2 focus:ring-floodlight"
                        />
                    ))}
                </div>

                <div aria-live="polite" className="grid gap-4">
                    {!complete && <p className="m-0 text-[13px] text-fg-3">Tip: paste the whole code into the first box.</p>}
                    {checking && <p className="m-0 text-sm text-fg-2">Looking for the room…</p>}
                    {answer?.state==='error' && <p role="alert" className="m-0 rounded-xl bg-alert/10 px-3.5 py-2.5 text-sm text-alert">{answer.message}</p>}

                    {alreadyIn && (
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-white/15 bg-night/50 px-3.5 py-3">
                            <span className="text-sm text-fg-2">You're already in <b className="text-fg">{alreadyIn.room.name}</b>.</span>
                            <Button kind="secondary" size="sm" arrow onClick={()=>navigate(roomHome(alreadyIn.room._id,alreadyIn.myRole))}>Open it</Button>
                        </div>
                    )}

                    {room && !alreadyIn && (
                        <>
                            <div className="flex items-center justify-between gap-3 rounded-[14px] border border-white/15 bg-night/50 px-3.5 py-3">
                                <div className="min-w-0">
                                    <b className="block font-num text-[22px] leading-none font-black [overflow-wrap:anywhere] uppercase">{room.name}</b>
                                    <small className="text-[13px] text-fg-2">
                                        {room.type==='ipl' ? 'IPL franchises' : 'Custom teams'} · {room.teamCount} of {room.maxTeams} teams in
                                    </small>
                                </div>
                            </div>

                            {closedReason && <p role="alert" className="m-0 rounded-xl bg-alert/10 px-3.5 py-2.5 text-sm text-alert">{closedReason}</p>}

                            {!closedReason && isIpl && (
                                <div className="grid gap-2">
                                    <span id="join-franchise-label" className="text-sm font-semibold">Pick your franchise</span>
                                    <div role="radiogroup" aria-labelledby="join-franchise-label" className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                                        {franchises.map(f=>{
                                            const isTaken=taken.has(f.code)
                                            return (
                                                <button
                                                    key={f.code}
                                                    type="button"
                                                    role="radio"
                                                    aria-checked={pick===f.code}
                                                    aria-label={isTaken ? `${f.name}, taken` : f.name}
                                                    disabled={isTaken}
                                                    onClick={()=>{ setPick(f.code); setJoinError('') }}
                                                    style={{...teamStyle(f.glow),'--bz-edge':'4px'}}
                                                    className={`bz-team-chip grid aspect-square cursor-pointer place-items-center rounded-xl border-0 font-num text-[clamp(15px,4vw,19px)] font-black tracking-[.03em]
                                                        transition-transform duration-150 ease-bidzy focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-fg
                                                        disabled:cursor-not-allowed disabled:brightness-[.45] disabled:grayscale
                                                        ${pick===f.code ? 'outline-3 outline-offset-2 outline-white' : 'enabled:hover:-translate-y-0.5'}`}
                                                >
                                                    <span className="relative">{f.code}</span>
                                                    {isTaken && <span className="absolute bottom-[7px] font-text text-[9px] font-bold tracking-[.12em] text-white/85">TAKEN</span>}
                                                </button>
                                            )
                                        })}
                                    </div>
                                    <p className="m-0 min-h-[22px] text-[15px] text-fg-2">
                                        {pick ? <>You'll be <b className="text-fg">{byCode[pick]?.name}</b>.</> : taken.size===0 ? 'All 10 are free.' : `${taken.size} ${taken.size===1 ? 'franchise is' : 'franchises are'} taken.`}
                                    </p>
                                </div>
                            )}

                            {!closedReason && !isIpl && (
                                <>
                                    <Field id="join-team-name" label="Team name" value={teamName} maxLength={40} autoComplete="off" placeholder="Lane 4 Lions"
                                        onChange={e=>{ setTeamName(e.target.value); setJoinError('') }} onBlur={()=>setNameTouched(true)} error={nameError} />
                                    <div className="grid gap-2">
                                        <span id="join-colour-label" className="text-sm font-semibold">Team colour</span>
                                        <div role="radiogroup" aria-labelledby="join-colour-label" className="grid grid-cols-6 gap-2">
                                            {CUSTOM_COLOURS.map(c=>(
                                                <button
                                                    key={c}
                                                    type="button"
                                                    role="radio"
                                                    aria-checked={color===c}
                                                    aria-label={`Colour ${c}`}
                                                    onClick={()=>{ setColor(c); setJoinError('') }}
                                                    style={{background:c}}
                                                    className={`aspect-square cursor-pointer rounded-full border-0 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-fg
                                                        ${color===c ? 'outline-3 outline-offset-2 outline-white' : ''}`}
                                                />
                                            ))}
                                        </div>
                                        {tried&&!color && <span className="text-[13px] text-alert">Pick a colour</span>}
                                    </div>
                                </>
                            )}

                            {joinError && <p role="alert" className="m-0 rounded-xl bg-alert/10 px-3.5 py-2.5 text-sm text-alert">{joinError}</p>}

                            {!closedReason && (
                                <Button
                                    kind={ready ? 'team' : 'primary'}
                                    glow={ready ? glow : undefined}
                                    className="w-full"
                                    arrow={Boolean(ready)&&!busy}
                                    disabled={isIpl&&!pick}
                                    aria-busy={busy}
                                    onClick={handleJoin}
                                >
                                    {busy ? 'Joining…' : isIpl ? (pick ? `Join as ${pick}` : 'Pick a franchise') : (ready ? `Join as ${pickedName}` : 'Join the room')}
                                </Button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </Popup>
    )
}

export default JoinRoomPopup
