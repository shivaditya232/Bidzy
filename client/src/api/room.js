// Bridge until the lobby page (A3.5): the room you're working in is remembered after login,
// and every players/sets/auction/members call goes under /rooms/:roomId.
export const getRoomId=()=>localStorage.getItem('roomId')

export const roomPath=(path)=>`/rooms/${getRoomId()}${path}`
