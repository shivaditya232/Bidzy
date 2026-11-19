import {io} from "socket.io-client"
import { getRoomId } from "./room"

// don't connect on import: we need a token first.
// auth is a function so it reads the CURRENT token every time it (re)connects.
const socket=io("http://localhost:5050",{
    autoConnect:false,
    auth:(cb)=>cb({token:localStorage.getItem('token')})
})

// the server forgets which room a socket was in when the connection drops,
// so join the room again on every (re)connect
socket.on('connect',()=>{
    const roomId=getRoomId()
    if(roomId){
        socket.emit('join-room',roomId,(res)=>{
            if(!res?.ok) console.log('Could not join room:',res?.message)
        })
    }
})

socket.on('connect_error',(err)=>{
    console.log('Socket connection refused:',err.message)
})

// pages call this when they open. connects if needed, otherwise just (re)joins the current room
export const connectToRoom=()=>{
    if(socket.connected){
        socket.emit('join-room',getRoomId())
    }
    else{
        socket.connect()
    }
}

// call on login/logout so the next connection uses the new user's token
export const resetSocket=()=>{
    socket.disconnect()
}

export default socket
