import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import Aura from './Aura'

const FOCUSABLE='button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

// An accessible popup (modal). Esc or a click outside closes it, Tab stays inside,
// and focus goes back to whatever opened it.
//
//   <Popup open={open} onClose={()=>setOpen(false)} title="Start the auction?" actions={<>...buttons...</>}>
//       Settings lock once the first player is up.
//   </Popup>
//   glow: optional team colours ({p,pd,acc}); the top of the popup glows in them and cross-fades when they change
//   wide: a roomier popup for forms (520px instead of 420px), or wide="xl" (760px) for side-by-side layouts
// Pass a stable onClose (useCallback): a new function every render would re-run the focus handling.
function Popup({ open, onClose, title, children, actions, glow, wide=false }) {
    const sheetRef=useRef(null)
    const titleId=useId()

    useEffect(()=>{
        if(!open) return
        const opener=document.activeElement
        const sheet=sheetRef.current
        const first=sheet?.querySelector(FOCUSABLE)
        ;(first||sheet)?.focus()

        const onKey=(e)=>{
            if(e.key==='Escape'){
                e.preventDefault()
                onClose()
                return
            }
            if(e.key!=='Tab'||!sheet) return
            const items=[...sheet.querySelectorAll(FOCUSABLE)]
            if(items.length===0) return
            const firstItem=items[0]
            const lastItem=items[items.length-1]
            if(e.shiftKey&&document.activeElement===firstItem){
                e.preventDefault()
                lastItem.focus()
            }
            else if(!e.shiftKey&&document.activeElement===lastItem){
                e.preventDefault()
                firstItem.focus()
            }
        }
        document.addEventListener('keydown',onKey)
        return ()=>{
            document.removeEventListener('keydown',onKey)
            if(opener&&typeof opener.focus==='function') opener.focus()
        }
    },[open,onClose])

    if(!open) return null

    return createPortal(
        <div
            className="fixed inset-0 z-50 grid place-items-center bg-[rgb(3_4_6/.6)] p-5"
            onMouseDown={(e)=>{ if(e.target===e.currentTarget) onClose() }}
        >
            <div
                ref={sheetRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                className={`relative isolate max-h-[calc(100dvh-40px)] w-full overflow-y-auto rounded-[22px] border border-line bg-night-2 p-6 font-text text-fg outline-none
                    ${wide==='xl' ? 'max-w-[760px]' : wide ? 'max-w-[520px]' : 'max-w-[420px]'}`}
                style={{animation:'bidzy-rise .22s var(--ease-bidzy)'}}
            >
                {glow && (
                    <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
                        <Aura glow={glow} variant="sheet" className="h-full" />
                    </div>
                )}
                <h2 id={titleId} className="font-num text-[30px] leading-none font-extrabold uppercase">{title}</h2>
                <div className="mt-2 mb-5 text-fg-2">{children}</div>
                {actions && <div className="flex flex-wrap justify-end gap-2.5">{actions}</div>}
            </div>
        </div>,
        document.body
    )
}

export default Popup
