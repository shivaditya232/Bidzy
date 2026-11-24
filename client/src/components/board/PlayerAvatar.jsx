import { useState } from 'react'
import { initials } from '../../utils/board'

// a small square photo of a player, or their initials when there's no photo (never a broken image)
function PlayerAvatar({ player, className='size-11' }) {
    const [failed,setFailed]=useState(false)
    if(player?.image&&!failed){
        return <img src={player.image} alt="" onError={()=>setFailed(true)} className={`${className} shrink-0 rounded-[10px] object-cover object-[50%_15%]`} />
    }
    return (
        <span className={`${className} grid shrink-0 place-items-center rounded-[10px] bg-white/[.08] font-num text-lg font-black`} aria-hidden="true">
            {initials(player?.name)}
        </span>
    )
}

export default PlayerAvatar
