function PlayerStatsModal({ player, onClose }) {
    if (!player) return null;

    const statFields = [
        { label: 'Matches', value: player.stats?.matches },
        { label: 'Runs', value: player.stats?.runs },
        { label: 'Batting Average', value: player.stats?.battingAverage },
        { label: 'Strike Rate', value: player.stats?.strikeRate },
        { label: 'Wickets', value: player.stats?.wickets },
        { label: 'Bowling Economy', value: player.stats?.bowlingEconomy }
    ].filter(stat => stat.value);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-6 max-w-sm w-full">
                <div className="flex items-center justify-between mb-1">
                    <h2 className="text-lg font-semibold text-slate-800">{player.name}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
                </div>
                <p className="text-sm text-slate-500 mb-4">
                    {player.role}{player.country ? ` - ${player.country}` : ''}
                </p>

                {statFields.length === 0 && (
                    <p className="text-sm text-slate-500 mb-4">No stats available</p>
                )}

                {statFields.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-4 bg-slate-50 rounded-lg p-4 mb-4">
                        {statFields.map(stat => (
                            <div key={stat.label}>
                                <p className="text-xs text-slate-500">{stat.label}</p>
                                <p className="text-sm font-semibold text-slate-800">{stat.value}</p>
                            </div>
                        ))}
                    </div>
                )}

                {player.soldPrice && (
                    <p className="text-sm text-slate-600 text-center">
                        Sold Price: <span className="font-medium text-indigo-600">{player.soldPrice}</span>
                    </p>
                )}
            </div>
        </div>
    );
}

export default PlayerStatsModal;
