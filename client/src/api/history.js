import api from './axios'
import { roomPath } from './room'

// Saved rounds: each time the host starts a new round, the finished one is archived.
// [{_id, completedAt, results:[{playerName, role, country, status, soldPrice, teamName, image, stats}]}], newest first
export const getRounds=async(roomId)=>(await api.get(roomPath(roomId,'/auction/rounds'))).data

export const getRoundById=async(roomId,roundId)=>(await api.get(roomPath(roomId,`/auction/rounds/${roundId}`))).data
