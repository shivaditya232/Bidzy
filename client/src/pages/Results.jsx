import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import api from "../api/axios"
import Navbar from "../components/Navbar"

const cardClass = "bg-white rounded-2xl ring-1 ring-slate-900/5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_24px_-16px_rgba(15,23,42,0.18)] p-6"

function Results() {
    const [players, setPlayers] = useState([])
    const navigate = useNavigate()

    useEffect(() => {
        api.get('/players')
        .then(res => {
            setPlayers(res.data)
        })
        .catch(err => {
            console.log(err)
        })
    }, [])

    const soldPlayers = players.filter(p => p.status === 'sold')
    const unsoldPlayers = players.filter(p => p.status === 'unsold')

    const teams = {}
    soldPlayers.forEach(player => {
        if (!player.soldTo) return
        const teamId = player.soldTo._id
        if (!teams[teamId]) {
            teams[teamId] = {
                teamName: player.soldTo.teamName,
                players: [],
                totalSpent: 0
            }
        }
        teams[teamId].players.push(player)
        teams[teamId].totalSpent += player.soldPrice || 0
    })

    return (
        <div className="min-h-screen bg-slate-50 relative overflow-hidden">
            <div className="pointer-events-none fixed -top-32 -right-32 h-96 w-96 rounded-full bg-indigo-200/30 blur-3xl" />
            <div className="pointer-events-none fixed -bottom-40 -left-40 h-96 w-96 rounded-full bg-violet-200/20 blur-3xl" />

            <Navbar
                title="Results"
                actions={[
                    { label:'Past Auctions', onClick:()=>navigate('/history') },
                    { label:'Back', onClick:()=>navigate(-1) }
                ]}
            />

            <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-8">

                <h1 className="font-display font-bold text-2xl text-slate-800 mb-6">Auction Results</h1>

                {Object.keys(teams).length === 0 && (
                    <div className={`${cardClass} text-center text-slate-500 mb-6`}>
                        No players sold yet
                    </div>
                )}

                <div className="grid gap-6 mb-6">
                    {Object.values(teams).map(team => (
                        <div key={team.teamName} className={cardClass}>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-display font-semibold text-lg text-slate-800 flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-indigo-500" />
                                    {team.teamName}
                                </h2>
                                <span className="text-sm text-slate-500">
                                    Total Spent: <span className="font-semibold text-slate-800">{team.totalSpent}</span>
                                </span>
                            </div>
                            <div className="grid grid-cols-3 px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 border-b border-slate-200">
                                <span>Name</span>
                                <span>Role</span>
                                <span>Price</span>
                            </div>
                            {team.players.map(player => (
                                <div key={player._id} className="grid grid-cols-3 px-2 py-2.5 text-sm text-slate-800 border-b border-slate-100 last:border-b-0">
                                    <span className="font-medium">{player.name}</span>
                                    <span className="text-slate-500">{player.role}</span>
                                    <span className="text-slate-500">{player.soldPrice}</span>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>

                <div className={cardClass}>
                    <h2 className="font-display font-semibold text-lg text-slate-800 flex items-center gap-2 mb-4">
                        <span className="h-2 w-2 rounded-full bg-indigo-500" />
                        Unsold Players
                    </h2>
                    {unsoldPlayers.length === 0 && (
                        <p className="text-sm text-slate-500">No unsold players</p>
                    )}
                    {unsoldPlayers.map(player => (
                        <div key={player._id} className="grid grid-cols-2 px-2 py-2.5 text-sm text-slate-800 border-b border-slate-100 last:border-b-0">
                            <span className="font-medium">{player.name}</span>
                            <span className="text-slate-500">{player.role}</span>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    )
}

export default Results
