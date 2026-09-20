import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import api from "../api/axios"
import Navbar from "../components/Navbar"

const cardClass = "bg-white rounded-2xl ring-1 ring-slate-900/5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_24px_-16px_rgba(15,23,42,0.18)] p-6"

function PastAuctions() {
    const [rounds, setRounds] = useState([])
    const navigate = useNavigate()

    useEffect(() => {
        api.get('/auction/rounds')
        .then(res => {
            setRounds(res.data)
        })
        .catch(err => {
            console.log(err)
        })
    }, [])

    return (
        <div className="min-h-screen bg-slate-50 relative overflow-hidden">
            <div className="pointer-events-none fixed -top-32 -right-32 h-96 w-96 rounded-full bg-indigo-200/30 blur-3xl" />
            <div className="pointer-events-none fixed -bottom-40 -left-40 h-96 w-96 rounded-full bg-violet-200/20 blur-3xl" />

            <Navbar
                title="Past Auctions"
                actions={[{ label:'Back', onClick:()=>navigate(-1) }]}
            />

            <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-8">

                <h1 className="font-display font-bold text-2xl text-slate-800 mb-6">Past Auctions</h1>

                {rounds.length === 0 && (
                    <div className={`${cardClass} text-center text-slate-500`}>
                        No past auctions yet
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {rounds.map(round => {
                        const soldCount = round.results.filter(r => r.status === 'sold').length
                        const unsoldCount = round.results.filter(r => r.status === 'unsold').length
                        const totalSpent = round.results.reduce((sum,r) => sum + (r.soldPrice || 0), 0)
                        const teamCount = new Set(round.results.filter(r => r.status === 'sold').map(r => r.teamName)).size

                        return (
                            <div key={round._id}
                                onClick={() => navigate(`/history/${round._id}`)}
                                className={`${cardClass} cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all`}>
                                <h2 className="font-display font-semibold text-lg text-slate-800 mb-3 flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-indigo-500" />
                                    Auction on {new Date(round.completedAt).toLocaleDateString()}
                                </h2>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                                    <span>{soldCount} sold</span>
                                    <span>{unsoldCount} unsold</span>
                                    <span>{teamCount} teams</span>
                                    <span>Total spent: {totalSpent}</span>
                                </div>
                            </div>
                        )
                    })}
                </div>

            </div>
        </div>
    )
}

export default PastAuctions
