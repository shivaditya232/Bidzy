import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Aura from '../components/ui/Aura'
import Button from '../components/ui/Button'
import Toast from '../components/ui/Toast'
import RoomCard from '../components/RoomCard'
import CreateRoomPopup from '../components/CreateRoomPopup'
import JoinRoomPopup from '../components/JoinRoomPopup'
import { getMe, logout } from '../api/auth'
import { getMyRooms } from '../api/rooms'
import { useFranchises } from '../hooks/useFranchises'
import { sortRooms, greeting, lobbyLine } from '../utils/lobby'

// Your rooms: every room you host or play in, live ones first.
// From here you create a room or join one with a code (both open as popups).
function Lobby(){
    const navigate=useNavigate()
    const { byCode }=useFranchises()
    const [name,setName]=useState('')
    const [rooms,setRooms]=useState(null) // null = still loading
    const [loadError,setLoadError]=useState(false)
    const [popup,setPopup]=useState(null) // 'create' | 'join' | null
    const [toast,setToast]=useState(null)
    const toastTimer=useRef(null)

    const signOut=useCallback(()=>{
        logout()
        navigate('/login',{replace:true})
    },[navigate])

    const loadRooms=useCallback(()=>{
        return getMyRooms()
            .then(list=>{ setRooms(list); setLoadError(false) })
            .catch(err=>{
                if(err.response?.status===401) return signOut()
                setLoadError(true)
            })
    },[signOut])

    useEffect(()=>{
        getMe().then(me=>setName(me.name)).catch(()=>{})
        loadRooms()
    },[loadRooms])

    useEffect(()=>()=>clearTimeout(toastTimer.current),[])

    const showToast=useCallback((message)=>{
        clearTimeout(toastTimer.current)
        setToast(message)
        toastTimer.current=setTimeout(()=>setToast(null),2200)
    },[])

    const copyCode=async(code)=>{
        try{
            await navigator.clipboard.writeText(code)
            showToast(`Code ${code} copied`)
        }
        catch{
            showToast(`Code: ${code}`)
        }
    }

    // stable, so the popup doesn't re-run its focus handling on every render
    const closePopup=useCallback(()=>setPopup(null),[])

    const sorted=rooms ? sortRooms(rooms) : []
    const firstName=name.split(' ')[0]

    const actions=(
        <div className="flex flex-wrap items-center gap-3">
            <Button kind="primary" arrow onClick={()=>setPopup('create')}>Create a room</Button>
            <Button kind="secondary" onClick={()=>setPopup('join')}>Join with a code</Button>
        </div>
    )

    return (
        <div className="min-h-screen bg-night font-text text-fg antialiased">
            <Aura variant="page" as="header" className="pb-14">
                <div className="mx-auto max-w-[1120px] px-4 pt-6 sm:px-5">
                    <nav className="mb-14 flex items-center justify-between gap-3 sm:mb-16" aria-label="Main">
                        <Link to="/lobby" className="font-num text-[22px] font-black tracking-[.06em] text-fg no-underline">BIDZY</Link>
                        <div className="flex items-center gap-3.5">
                            {firstName && (
                                <span className="grid size-[34px] place-items-center rounded-full bg-white/[.12] font-num text-base font-extrabold" aria-hidden="true">
                                    {firstName[0].toUpperCase()}
                                </span>
                            )}
                            <Button kind="quiet" onClick={signOut}>Log out</Button>
                        </div>
                    </nav>
                    <span className="text-xs font-semibold tracking-[.16em] text-fg-2 uppercase">Your lobby</span>
                    <h1 className="mt-1.5 mb-2.5 font-num text-[clamp(48px,8vw,96px)] leading-[.88] font-black uppercase [text-wrap:balance]">
                        {greeting()}{firstName ? `, ${firstName}` : ''}
                    </h1>
                    <p className="m-0 mb-6 max-w-[46ch] text-[17px] text-fg-2">
                        {rooms ? lobbyLine(rooms) : loadError ? "Your rooms didn't load." : 'Loading your rooms…'}
                    </p>
                    {actions}
                </div>
            </Aura>

            <main className="mx-auto max-w-[1120px] px-4 pt-2 pb-20 sm:px-5">
                {loadError && (
                    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-alert/10 px-4 py-3 text-alert">
                        <span>Can't reach Bidzy right now. Check your connection.</span>
                        <Button kind="secondary" size="sm" onClick={loadRooms}>Try again</Button>
                    </div>
                )}

                {rooms&&rooms.length===0 && (
                    <div className="grid justify-items-center gap-3.5 rounded-3xl border border-dashed border-white/15 px-5 py-12 text-center">
                        {/* an empty ground: the boundary arc and the pitch */}
                        <div className="relative aspect-[2/1] w-[min(260px,70vw)] max-w-full rounded-t-full border-2 border-b-0 border-floodlight/20" aria-hidden="true">
                            <span className="absolute bottom-0 left-1/2 h-[46%] w-[18px] -translate-x-1/2 rounded-t-[3px] bg-floodlight/10" />
                        </div>
                        <h2 className="m-0 font-num text-[34px] font-black uppercase">The ground is empty</h2>
                        <p className="m-0 max-w-[40ch] text-fg-2">Rooms you create or join show up here, with your team's colours.</p>
                    </div>
                )}

                {sorted.length>0 && (
                    <>
                        <div className="mb-4 flex items-baseline justify-between gap-3">
                            <h2 className="m-0 font-num text-[30px] font-black tracking-[.02em] uppercase">Your rooms</h2>
                            <span className="text-sm text-fg-3">{sorted.length===1 ? '1 room' : `${sorted.length} rooms`}</span>
                        </div>
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-4">
                            {sorted.map(entry=>(
                                <RoomCard
                                    key={entry.room._id}
                                    entry={entry}
                                    franchisesByCode={byCode}
                                    wide={entry.room.status==='live'}
                                    onCopyCode={copyCode}
                                />
                            ))}
                        </div>
                    </>
                )}
            </main>

            {/* mounted only while open, so each one starts fresh */}
            {popup==='create' && <CreateRoomPopup onClose={closePopup} onCreated={loadRooms} onCopyCode={copyCode} />}
            {popup==='join' && <JoinRoomPopup onClose={closePopup} myRooms={rooms||[]} />}
            {toast && <Toast message={toast} tone="good" />}
        </div>
    )
}

export default Lobby
