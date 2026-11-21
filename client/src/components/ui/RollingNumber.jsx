import { useEffect, useRef, useState } from 'react'

const ROLL_MS=280

// A number that rolls up when it changes: the old value slides out the top, the new one in from below.
// Give it the already-formatted text (e.g. formatMoney(price)).
//
//   <RollingNumber value={formatMoney(price)} className="font-num text-[96px]" />
function RollingNumber({ value, className='' }) {
    const [items,setItems]=useState([{id:0,text:value,leaving:false}])
    const nextId=useRef(1)

    useEffect(()=>{
        setItems(prev=>{
            const current=prev[prev.length-1]
            if(current&&current.text===value){
                return prev
            }
            const id=nextId.current++
            return [...prev.filter(i=>!i.leaving).map(i=>({...i,leaving:true})),{id,text:value,leaving:false}]
        })
        const timer=setTimeout(()=>setItems(prev=>prev.filter(i=>!i.leaving)),ROLL_MS+40)
        return ()=>clearTimeout(timer)
    },[value])

    return (
        <span className={`relative inline-block h-[.9em] overflow-hidden whitespace-nowrap leading-[.9] tabular-nums ${className}`}>
            {/* screen readers hear the current value once, not the animation */}
            <span className="sr-only" aria-live="polite">{value}</span>
            {items.map(item=>(
                <span
                    key={item.id}
                    aria-hidden="true"
                    className={item.leaving ? 'absolute inset-0 block' : 'block'}
                    style={{animation:`${item.leaving ? 'bidzy-roll-out' : 'bidzy-roll-in'} ${ROLL_MS}ms var(--ease-bidzy) ${item.leaving ? 'forwards' : ''}`}}
                >
                    {item.text}
                </span>
            ))}
        </span>
    )
}

export default RollingNumber
