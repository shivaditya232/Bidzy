import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import Button from '../components/ui/Button'
import { getMe, logout } from '../api/auth'

// Temporary landing for an account that isn't in any room yet.
// The lobby (create / join a room) replaces this next.
function Welcome(){
    const navigate=useNavigate()
    const [name,setName]=useState('')

    useEffect(()=>{
        getMe().then(me=>setName(me.name)).catch(()=>{})
    },[])

    const handleLogout=()=>{
        logout()
        navigate('/login',{replace:true})
    }

    return (
        <AuthLayout title={name ? `You're in, ${name.split(' ')[0]}` : "You're in"} subtitle="You're not in any room yet.">
            <p className="m-0 text-fg-2">Creating and joining rooms comes next. Once you're in a room, logging in takes you straight to it.</p>
            <Button kind="secondary" onClick={handleLogout} className="w-full">Log out</Button>
        </AuthLayout>
    )
}

export default Welcome
