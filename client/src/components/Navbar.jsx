function Navbar({ title, actions=[] }) {
    return (
        <header className="sticky top-0 z-40 backdrop-blur-md bg-white/80 border-b border-slate-200/80">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <span className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-display font-bold text-sm shadow-md shadow-indigo-500/30">
                        B
                    </span>
                    <span className="font-display font-bold text-lg text-slate-800 tracking-tight">Bidzy</span>
                    {title && (
                        <>
                            <span className="hidden sm:inline text-slate-300">/</span>
                            <span className="hidden sm:inline text-sm font-medium text-slate-500">{title}</span>
                        </>
                    )}
                </div>
                {actions.length > 0 && (
                    <nav className="flex items-center gap-1">
                        {actions.map((action,i)=>(
                            <button
                                key={i}
                                onClick={action.onClick}
                                className={
                                    action.tone==='danger'
                                        ? "text-sm font-semibold px-3.5 py-2 rounded-full text-red-600 hover:bg-red-50 transition-colors"
                                        : "text-sm font-semibold px-3.5 py-2 rounded-full text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                                }
                            >
                                {action.label}
                            </button>
                        ))}
                    </nav>
                )}
            </div>
        </header>
    )
}

export default Navbar
