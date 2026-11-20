import {io} from "socket.io-client"

// don't connect on import: we need a token first.
// auth is a function so it reads the CURRENT token every time it (re)connects.
const socket=io("http://localhost:5050",{
    autoConnect:false,
    auth:(cb)=>cb({token:localStorage.getItem('token')})
})

// the room this tab is following. module state = per tab, so two tabs can follow two rooms.
let currentRoomId=null

const joinCurrentRoom=()=>{
    if(!currentRoomId) return
    socket.emit('join-room',currentRoomId,(res)=>{
        if(!res?.ok) console.log('Could not join room:',res?.message)
    })
}

// the server forgets which room a socket was in when the connection drops,
// so join the room again on every (re)connect
socket.on('connect',joinCurrentRoom)

socket.on('connect_error',(err)=>{
    console.log('Socket connection refused:',err.message)
})

// pages call this with the roomId from the URL when they open.
// connects if needed, otherwise just (re)joins (the server leaves the old room for us).
export const connectToRoom=(roomId)=>{
    currentRoomId=roomId
    if(socket.connected){
        joinCurrentRoom()
    }
    else{
        socket.connect()
    }
}

// call on login/logout so the next connection uses the new user's token
export const resetSocket=()=>{
    currentRoomId=null
    socket.disconnect()
}

export default socket
