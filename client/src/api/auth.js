import api from './axios'
import { resetSocket } from './socket'

// Account functions for the pages to call. Each one throws on failure;
// use errorMessage(err) from ./axios to get the server's message.

const startSession=(token)=>{
    localStorage.setItem('token',token)
    resetSocket() // the next socket connection must use this user's token
}

// creates the account and logs straight in. returns {id, name, email}
export const signup=async({name,email,password})=>{
    const res=await api.post('/auth/register',{name,email,password})
    startSession(res.data.token)
    return res.data.user
}

// returns {id, name, email}
export const login=async({email,password})=>{
    const res=await api.post('/auth/login',{email,password})
    startSession(res.data.token)
    return res.data.user
}

export const logout=()=>{
    localStorage.removeItem('token')
    // leftovers from the old single-room bridge, cleared so they can't confuse anything
    localStorage.removeItem('role')
    localStorage.removeItem('roomId')
    resetSocket()
}

export const isLoggedIn=()=>Boolean(localStorage.getItem('token'))

// {_id, name, email, createdAt}
export const getMe=async()=>(await api.get('/users/me')).data
