// Pure helpers for the IPL 2026 pack picker and the photo cropper (tested without a browser).

// what the host starts with ticked: the big names and the specialists, not every fast bowler and uncapped kid
export const DEFAULT_GROUPS=['Marquee','Batters','Wicketkeepers','Allrounders','Spinners']

export const GROUP_NOTES={
    Marquee:'The biggest names',
    Batters:'Specialist batters',
    Wicketkeepers:'Keepers who bat',
    Allrounders:'Bat and bowl',
    'Fast bowlers':'Pace',
    Spinners:'Spin',
    Uncapped:'Young Indian players'
}

// a group is "in" when any of its sets already has players in this room
export const groupsInRoom=(groups=[],roomSets=[],players=[])=>{
    const filled=new Set(roomSets.filter(s=>players.some(p=>String(p.set?._id??p.set)===String(s._id))).map(s=>s.name))
    return groups.filter(g=>g.sets.some(name=>filled.has(name))).map(g=>g.name)
}

const duration=(minutes)=>{
    if(minutes<60) return `${minutes} min`
    const h=Math.floor(minutes/60)
    const m=minutes%60
    return m ? `${h} h ${m} min` : `${h} h`
}

// the line under the picker: how many players, in how many sets, and roughly how long the auction runs
export const pickSummary=(groups=[],chosen=[],secondsPerPlayer=45)=>{
    const picked=groups.filter(g=>chosen.includes(g.name))
    const count=picked.reduce((n,g)=>n+g.count,0)
    const sets=picked.reduce((n,g)=>n+g.sets.length,0)
    if(count===0) return {count,sets,line:'Pick at least one set'}
    return {count,sets,line:`in ${sets} ${sets===1 ? 'set' : 'sets'} · about ${duration(Math.max(1,Math.round(count*secondsPerPlayer/60)))} at ${secondsPerPlayer} s a player`}
}

export const toggleGroup=(chosen,name)=>chosen.includes(name) ? chosen.filter(g=>g!==name) : [...chosen,name]

// ---------- photo crop ----------
export const PHOTO_SIZE=320      // the saved square, in px
export const MAX_PHOTO_KB=60     // the server's limit (server/utils/playerImage.js)

// the scale that makes the photo just cover a square of side `box`
export const coverScale=(box,width,height)=>Math.max(box/width,box/height)

// keep the photo covering the square: never show an empty corner
export const clampOffset=({x,y},{box,width,height,scale})=>{
    const w=width*scale
    const h=height*scale
    const maxX=Math.max(0,(w-box)/2)
    const maxY=Math.max(0,(h-box)/2)
    return {x:Math.min(maxX,Math.max(-maxX,x)),y:Math.min(maxY,Math.max(-maxY,y))}
}

// how big a data URL is once decoded, in KB
export const dataUrlKb=(url='')=>{
    const comma=url.indexOf(',')
    return comma<0 ? 0 : Math.round((url.length-comma-1)*3/4/1024)
}

// the credit line under a photo: "RIGI · CC BY 3.0"
export const creditLine=(credit)=>credit ? [credit.author,credit.license].filter(Boolean).join(' · ') : ''
