// A short message at the bottom of the screen, in Bidzy's voice.
// tone: 'info' | 'good' | 'bad' (only changes the small side bar).
//
//   <Toast title="Beaten." message="MI got there 0.03 s before you." tone="bad" />
const BAR={info:'bg-fg-2',good:'bg-sold',bad:'bg-alert'}

function Toast({ title, message, tone='info' }) {
    if(!message&&!title) return null
    return (
        <div
            role="status"
            aria-live="polite"
            className="fixed bottom-[max(20px,env(safe-area-inset-bottom))] left-1/2 z-40 flex w-[min(92vw,460px)] -translate-x-1/2 items-start gap-3 overflow-hidden
                rounded-2xl border border-line bg-night-2 py-3 pr-4 pl-5 font-text text-sm text-fg shadow-[0_18px_40px_rgb(0_0_0/.45)]"
            style={{animation:'bidzy-rise .22s var(--ease-bidzy)'}}
        >
            <span className={`absolute inset-y-0 left-0 w-1 ${BAR[tone]||BAR.info}`} aria-hidden="true" />
            {title && <b className="whitespace-nowrap">{title}</b>}
            <span className="text-fg-2">{message}</span>
        </div>
    )
}

export default Toast
