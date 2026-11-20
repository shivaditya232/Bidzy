import { useParams } from 'react-router-dom'

// The room you're in comes from the URL: /rooms/:roomId/...
// (not localStorage, so two tabs can be in two different rooms)
export const useRoomId=()=>useParams().roomId

// build an API path inside a room: roomPath(roomId,'/players') -> /rooms/<id>/players
export const roomPath=(roomId,path)=>`/rooms/${roomId}${path}`
