import { creditLine } from '../../utils/pack'

// "📷 RIGI · CC BY 3.0 · Wikimedia Commons": who took a photo and its licence, with links when we have them.
// Commons photos must be shown with this. Nothing renders when there's no credit.
//   oneLine: stays on one line and trims the end with … (for tight spots like the lot card)
function PhotoCredit({ credit, oneLine=false, className='' }) {
    if(!credit||!creditLine(credit)) return null
    const link='text-fg-2 underline decoration-white/25 underline-offset-2 hover:text-fg'
    return (
        <p className={`m-0 flex items-start gap-1.5 text-xs text-fg-3 ${oneLine ? 'whitespace-nowrap' : ''} ${className}`}>
            <span aria-hidden="true">📷</span>
            <span className={`min-w-0 ${oneLine ? 'truncate' : ''}`}>
                Photo: {shortAuthor(credit.author)}
                {credit.license && <> · {credit.licenseUrl ? <a className={link} href={credit.licenseUrl} target="_blank" rel="noopener noreferrer">{credit.license}</a> : credit.license}</>}
                {credit.page && <> · <a className={link} href={credit.page} target="_blank" rel="noopener noreferrer">Wikimedia Commons</a></>}
            </span>
        </p>
    )
}

// some Commons authors are just a web address: show "bollywoodhungama.com", not the whole link
const shortAuthor=(author)=>String(author||'Unknown').replace(/^https?:\/\/(www\.)?/i,'').replace(/\/$/,'')

export default PhotoCredit
