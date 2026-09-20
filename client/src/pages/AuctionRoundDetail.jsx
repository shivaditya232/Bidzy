import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import api from "../api/axios"
import Navbar from "../components/Navbar"

const cardClass = "bg-white rounded-2xl ring-1 ring-slate-900/5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_24px_-16px_rgba(15,23,42,0.18)] p-6"

function AuctionRoundDetail() {
    const [round, setRound] = useState(null)
    const navigate = useNavigate()
    const { id } = useParams()

    useEffect(() => {
        api.get(`/auction/rounds/${id}`)
        .then(res => {
            setRound(res.data)
        })
        .catch(err => {
            console.log(err)
        })
    }, [id])

    const groupRoundResults = (results) => {
        const roundTeams = {}
        results.filter(r => r.status === 'sold').forEach(r => {
            if (!roundTeams[r.teamName]) {
                roundTeams[r.teamName] = {
                    teamName: r.teamName,
                    players: [],
                    totalSpent: 0
                }
            }
            roundTeams[r.teamName].players.push(r)
            roundTeams[r.teamName].totalSpent += r.soldPrice || 0
        })
        return roundTeams
    }

    if (!round) {
        return (
            <div className="min-h-screen bg-slate-50">
                <Navbar title="Past Auction" actions={[{ label:'Back to Past Auctions', onClick:()=>navigate('/history') }]} />
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 text-slate-500">Loading...</div>
            </div>
        )
    }

    const roundTeams = groupRoundResults(round.results)
    const roundUnsold = round.results.filter(r => r.status === 'unsold')

    return (
        <div className="min-h-screen bg-slate-50 relative overflow-hidden">
            <div className="pointer-events-none fixed -top-32 -right-32 h-96 w-96 rounded-full bg-indigo-200/30 blur-3xl" />
            <div className="pointer-events-none fixed -bottom-40 -left-40 h-96 w-96 rounded-full bg-violet-200/20 blur-3xl" />

            <Navbar
                title="Past Auction"
                actions={[{ label:'Back to Past Auctions', onClick:()=>navigate('/history') }]}
            />

            <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-8">

                <h1 className="font-display font-bold text-2xl text-slate-800 mb-6">
                    Auction on {new Date(round.completedAt).toLocaleDateString()}
                </h1>

                <div className="grid gap-6 mb-6">
                    {Object.values(roundTeams).map(team => (
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
                            {team.players.map((player,index) => (
                                <div key={index} className="grid grid-cols-3 px-2 py-2.5 text-sm text-slate-800 border-b border-slate-100 last:border-b-0">
                                    <span className="font-medium">{player.playerName}</span>
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
                    {roundUnsold.length === 0 && (
                        <p className="text-sm text-slate-500">No unsold players</p>
                    )}
                    {roundUnsold.map((player,index) => (
                        <div key={index} className="grid grid-cols-2 px-2 py-2.5 text-sm text-slate-800 border-b border-slate-100 last:border-b-0">
                            <span className="font-medium">{player.playerName}</span>
                            <span className="text-slate-500">{player.role}</span>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    )
}

export default AuctionRoundDetail
