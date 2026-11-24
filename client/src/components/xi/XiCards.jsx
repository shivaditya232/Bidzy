import { useState } from 'react'
import { initials } from '../../utils/board'
import { powerStat, ROLE_SHORT, ROLE_BAND, ROLE_COLOUR } from '../../utils/xi'

// a player's photo, or big initials when there's none (never a broken image)
export function CardPhoto({ player }) {
    const [failed,setFailed]=useState(false)
    if(player.image&&!failed){
        return <img className="xi-photo" src={player.image} alt="" draggable="false" onError={()=>setFailed(true)} />
    }
    return <span className="xi-photo" aria-hidden="true">{initials(player.name)}</span>
}

// the landscape card on the team sheet
//   cardProps: data-card, onPointerDown etc. from the builder (left out on the copy shown in the backups popup)
export function SheetCard({ player, overseas, className='', cardProps={} }) {
    const stat=powerStat(player)
    return (
        <button type="button" className={`xi-scard ${className}`} style={{'--rc':ROLE_COLOUR[player.role]}}
            aria-label={`${player.name}, ${player.role}${overseas ? ', overseas' : ''}`} {...cardProps}>
            <CardPhoto player={player} />
            <span className="min-w-0">
                <b className="xi-name">{player.name}</b>
                <span className="xi-rolechip">{ROLE_SHORT[player.role]}</span>
            </span>
            <span className="xi-stat">{stat.value}<small>{stat.label}</small></span>
            {overseas && <span className="xi-os" aria-hidden="true">OS</span>}
        </button>
    )
}

// the portrait card in your hand
//   backupFor: positions he backs up, e.g. [5, 7]
export function HandCard({ player, overseas, backupFor=[], className='', cardProps={} }) {
    const stat=powerStat(player)
    return (
        <button type="button" className={`xi-hcard ${className}`} style={{'--rc':ROLE_COLOUR[player.role]}}
            aria-label={`${player.name}, ${player.role}${overseas ? ', overseas' : ''}${backupFor.length ? `, backup for ${backupFor.join(' and ')}` : ''}`} {...cardProps}>
            <span className="xi-band">{ROLE_BAND[player.role]}</span>
            <CardPhoto player={player} />
            <span className="xi-foot">
                <b className="xi-name">{player.name.split(' ').map((word,i)=><span key={`w-${i}`} className="block">{word}</span>)}</b>
                <span className="xi-stat"><small>{stat.label}</small>{stat.value}</span>
            </span>
            {overseas && <span className="xi-os" aria-hidden="true">OS</span>}
            {backupFor.length>0 && <span className="xi-bkm">BACKUP {backupFor.join(',')}</span>}
        </button>
    )
}
