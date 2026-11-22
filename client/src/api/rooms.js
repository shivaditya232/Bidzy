import api from './axios'

// Room functions for the pages to call (lobby, create, join, settings).
// Each one throws on failure; use errorMessage(err) from ./axios for the server's message.

// [{room:{_id,name,inviteCode,status,teamCount,settings,host}, myRole:'host'|'team', teamName, purseRemaining}]
// newest first
export const getMyRooms=async()=>(await api.get('/rooms')).data

// type: 'ipl' (default: teams pick a franchise) or 'custom' (teams pick a name + colour)
// settings is optional: {purse, timerSeconds, maxTeams, increments:[{upTo,step},...,{upTo:null,step}], rules:{...}}
// returns the new room (you are its host)
export const createRoom=async({name,type,settings})=>(await api.post('/rooms',{name,type,settings})).data.room

// the 10 IPL franchises: [{code:'CSK', name, primary:'#FDB913', secondary}]
export const getFranchises=async()=>(await api.get('/rooms/franchises')).data

// look at a room before joining it: {name, type, status, teamCount, maxTeams, purse, takenFranchises:['CSK',...]}
export const previewRoom=async(inviteCode)=>(await api.get(`/rooms/preview/${encodeURIComponent(inviteCode)}`)).data

// IPL room: joinRoom({inviteCode, franchise:'CSK'})
// custom room: joinRoom({inviteCode, teamName, color:'#12AB9C'})
// returns {room, member} (you are a team in it)
export const joinRoom=async({inviteCode,franchise,teamName,color})=>(await api.post('/rooms/join',{inviteCode,franchise,teamName,color})).data

// your XI (teams only, private): {lineup:[11 x {player:id|null, backups:[ids]}], unplaced:[ids]}
// lineup[0] = batting position 1
export const getMyLineup=async(roomId)=>(await api.get(`/rooms/${roomId}/lineup`)).data

// save the whole XI (same shape). returns {lineup, unplaced}.
// the server checks: your own players, each starter once, backups only on filled positions, max 4 overseas starters
export const saveLineup=async(roomId,lineup)=>(await api.patch(`/rooms/${roomId}/lineup`,{lineup})).data

// every team's XI with player names filled in. only after the auction ends (403 before that)
export const getAllLineups=async(roomId)=>(await api.get(`/rooms/${roomId}/lineups`)).data

// {room, me:{id,role,teamName,purseRemaining}, members:[{id,userId,name,role,teamName,purseRemaining}]}
export const getRoom=async(roomId)=>(await api.get(`/rooms/${roomId}`)).data

// host only, lobby only. send just the fields that change: {name, purse, timerSeconds, maxTeams, increments}
// returns the updated room
export const updateSettings=async(roomId,changes)=>(await api.patch(`/rooms/${roomId}/settings`,changes)).data.room

// where to send someone after they pick / create / join a room
export const roomHome=(roomId,role)=>role==='host' ? `/rooms/${roomId}/host` : `/rooms/${roomId}/board`

// where everyone lands after logging in or signing up: the lobby, with all their rooms
export const HOME_PATH='/lobby'
