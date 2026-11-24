import api from './axios'
import { roomPath } from './room'

// Live-auction calls for the board. Each one throws on failure; use errorMessage(err) from ./axios for the message.

// {populatedSession:{status, currentPlayer:{...player}, currentPrice, highestBidder:{_id,teamName}, timerEndsAt}, recentBids:[{team, amount, createdAt}]}
export const getAuction=async(roomId)=>(await api.get(roomPath(roomId,'/auction'))).data

// raise your paddle: the server bids current price + one step for you
export const placeBid=async(roomId)=>(await api.post(roomPath(roomId,'/auction/bid'))).data

// every player in the room in auction order, set + soldTo filled in
export const getPlayers=async(roomId)=>(await api.get(roomPath(roomId,'/players'))).data

// the teams: [{_id, teamName, franchise, color, purse, purseRemaining, squadSize, overseasCount}]
export const getTeams=async(roomId)=>(await api.get(roomPath(roomId,'/members'))).data

// you in this room: membership + squadSize + overseasCount
export const getMyMember=async(roomId)=>(await api.get(roomPath(roomId,'/members/me'))).data
