import api from './axios'
import { roomPath } from './room'

// The host's calls: players, sets, start and reset. Each one throws on failure; use errorMessage(err) from ./axios.

// sets in auction order: [{_id, name, sequence}]
export const getSets=async(roomId)=>(await api.get(roomPath(roomId,'/sets'))).data
export const createSet=async(roomId,name)=>(await api.post(roomPath(roomId,'/sets'),{name})).data.set
// the whole order at once: the first id goes first
export const reorderSets=async(roomId,orderedSetIds)=>(await api.patch(roomPath(roomId,'/sets/reorder'),{orderedSetIds})).data
// only works on a set with no players in it
export const deleteSet=async(roomId,setId)=>(await api.delete(roomPath(roomId,`/sets/${setId}`))).data

// player: {name, role, country, basePrice, set, image, stats}
export const createPlayer=async(roomId,player)=>(await api.post(roomPath(roomId,'/players'),player)).data.player
export const updatePlayer=async(roomId,playerId,changes)=>(await api.patch(roomPath(roomId,`/players/${playerId}`),changes)).data.player
// only players who haven't been auctioned yet
export const deletePlayer=async(roomId,playerId)=>(await api.delete(roomPath(roomId,`/players/${playerId}`))).data

// lobby -> live: settings lock and the first player goes up
export const startAuction=async(roomId)=>(await api.post(roomPath(roomId,'/auction/start'))).data
// archive this round, give everyone their purse back, back to the lobby
export const resetAuction=async(roomId)=>(await api.post(roomPath(roomId,'/auction/reset'))).data

// the ready-made IPL 2026 pack: {about, license, total, photos, groups:[{name, sets, count, photos}]}
export const getPack=async(roomId)=>(await api.get(roomPath(roomId,'/players/pack'))).data
// load the picked groups of sets into the room: {added, skipped, sets}
export const loadPack=async(roomId,groups)=>(await api.post(roomPath(roomId,'/players/pack'),{groups})).data
