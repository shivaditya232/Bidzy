import api from './axios'

// Room functions for the pages to call (lobby, create, join, settings).
// Each one throws on failure; use errorMessage(err) from ./axios for the server's message.

// [{room:{_id,name,inviteCode,status,teamCount,settings,host}, myRole:'host'|'team', teamName, purseRemaining}]
// newest first
export const getMyRooms=async()=>(await api.get('/rooms')).data

// settings is optional: {purse, timerSeconds, maxTeams, increments:[{upTo,step},...,{upTo:null,step}]}
// returns the new room (you are its host)
export const createRoom=async({name,settings})=>(await api.post('/rooms',{name,settings})).data.room

// returns {room, member} (you are a team in it)
export const joinRoom=async({inviteCode,teamName})=>(await api.post('/rooms/join',{inviteCode,teamName})).data

// {room, me:{id,role,teamName,purseRemaining}, members:[{id,userId,name,role,teamName,purseRemaining}]}
export const getRoom=async(roomId)=>(await api.get(`/rooms/${roomId}`)).data

// host only, lobby only. send just the fields that change: {name, purse, timerSeconds, maxTeams, increments}
// returns the updated room
export const updateSettings=async(roomId,changes)=>(await api.patch(`/rooms/${roomId}/settings`,changes)).data.room

// where to send someone after they pick / create / join a room
export const roomHome=(roomId,role)=>role==='host' ? `/rooms/${roomId}/host` : `/rooms/${roomId}/board`
