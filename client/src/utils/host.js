// Pure helpers for the host's screen, kept here so they can be tested without a browser.
import { idOf } from './board.js'

// base prices hosts pick from, in lakhs (the IPL's own slabs)
export const BASE_PRICES=[20,30,40,50,75,100,125,150,200]

export const ROLES=['Batsman','Bowler','Allrounder','Wicketkeeper']

// which stats a role has (the rest stay 0)
export const STAT_FIELDS={
    Batsman:[['matches','Matches'],['runs','Runs'],['battingAverage','Average'],['strikeRate','Strike rate']],
    Wicketkeeper:[['matches','Matches'],['runs','Runs'],['battingAverage','Average'],['strikeRate','Strike rate']],
    Bowler:[['matches','Matches'],['wickets','Wickets'],['bowlingEconomy','Economy'],['runs','Runs']],
    Allrounder:[['matches','Matches'],['runs','Runs'],['wickets','Wickets'],['strikeRate','Strike rate']]
}

// players under their set, sets in auction order. sets with no players still show (so the host sees them)
export const groupBySet=(players=[],sets=[])=>{
    const ordered=[...sets].sort((a,b)=>a.sequence-b.sequence)
    return ordered.map(set=>({set,players:players.filter(p=>idOf(p.set)===String(set._id))}))
}

// what has to be true before the host can start
export const startChecks=(teams=[],players=[])=>{
    const pending=players.filter(p=>p.status==='pending').length
    return [
        {ok:teams.length>=2,text:teams.length>=2 ? `${teams.length} teams in` : `Need 2 teams (${teams.length} in)`},
        {ok:pending>=1,text:pending>=1 ? `${pending} ${pending===1 ? 'player' : 'players'} ready` : 'Add at least 1 player'}
    ]
}
export const canStart=(teams,players)=>startChecks(teams,players).every(c=>c.ok)

// where the auction is: lot n of total, how many sold/unsold, money spent
export const auctionProgress=(players=[],currentId)=>{
    const index=players.findIndex(p=>String(p._id)===String(currentId))
    const sold=players.filter(p=>p.status==='sold')
    return {
        lot:index>-1 ? index+1 : 0,
        total:players.length,
        sold:sold.length,
        unsold:players.filter(p=>p.status==='unsold').length,
        spent:sold.reduce((sum,p)=>sum+(p.soldPrice||0),0)
    }
}

// one row per team for the end-of-auction summary: what they bought and spent
export const teamSummaries=(teams=[],players=[])=>teams.map(team=>{
    const bought=players.filter(p=>p.status==='sold'&&idOf(p.soldTo)===String(team._id)).sort((a,b)=>(b.soldPrice||0)-(a.soldPrice||0))
    const spent=bought.reduce((sum,p)=>sum+(p.soldPrice||0),0)
    return {team,bought,spent}
})

export const biggestBuy=(players=[])=>players.filter(p=>p.status==='sold').reduce((best,p)=>(!best||(p.soldPrice||0)>(best.soldPrice||0)) ? p : best,null)

// ---------- the player form ----------
export const emptyPlayerForm=(setId='')=>({name:'',role:'Batsman',country:'India',basePrice:200,set:setId,image:'',stats:{}})

export const playerToForm=(player)=>({
    name:player.name||'',
    role:player.role||'Batsman',
    country:player.country||'',
    basePrice:player.basePrice||200,
    set:idOf(player.set),
    image:player.image||'',
    stats:Object.fromEntries(Object.entries(player.stats||{}).filter(([,v])=>v).map(([k,v])=>[k,String(v)]))
})

export const validatePlayer=(form)=>{
    const errors={}
    const name=String(form.name||'').trim()
    if(!name) errors.name='Enter the player\'s name'
    else if(name.length>60) errors.name='Keep it under 60 characters'
    if(!String(form.country||'').trim()) errors.country='Enter a country'
    if(!form.set) errors.set='Pick a set'
    const image=String(form.image||'').trim()
    if(image&&!/^https?:\/\/\S+$/i.test(image)) errors.image='Paste a full link starting with https://'
    for(const [key,label] of STAT_FIELDS[form.role]||[]){
        const raw=form.stats?.[key]
        if(raw===undefined||raw==='') continue
        const n=Number(raw)
        if(!Number.isFinite(n)||n<0) errors[key]=`${label} must be a number, 0 or more`
    }
    return errors
}

// what the server gets: only this role's stats, numbers as numbers
export const playerPayload=(form)=>({
    name:form.name.trim(),
    role:form.role,
    country:form.country.trim(),
    basePrice:Number(form.basePrice),
    set:form.set,
    image:form.image.trim(),
    stats:Object.fromEntries((STAT_FIELDS[form.role]||[]).map(([key])=>[key,Number(form.stats?.[key])||0]))
})

// ---------- the settings form (purse in crores on screen, lakhs on the server) ----------
export const settingsToForm=(settings)=>({
    purseCr:String((settings.purse||0)/100),
    timerSeconds:String(settings.timerSeconds??15),
    maxTeams:String(settings.maxTeams??10),
    squadMin:String(settings.rules?.squadMin??19),
    squadMax:String(settings.rules?.squadMax??25),
    overseasMin:String(settings.rules?.overseasMin??5),
    overseasMax:String(settings.rules?.overseasMax??8)
})

export const validateSettings=(form,{type='ipl',teamCount=0,minPlayerPrice=20}={})=>{
    const errors={}
    const int=(v)=>Number.isInteger(Number(v))&&String(v).trim()!==''
    const purse=Math.round(Number(form.purseCr)*100)
    if(!Number.isFinite(purse)||purse<1) errors.purse='Enter the purse in crores'
    if(!int(form.timerSeconds)||form.timerSeconds<5||form.timerSeconds>120) errors.timer='5 to 120 seconds'
    const most=type==='ipl' ? 10 : 20
    if(!int(form.maxTeams)||form.maxTeams<2||form.maxTeams>most) errors.maxTeams=`2 to ${most} teams`
    else if(Number(form.maxTeams)<teamCount) errors.maxTeams=`${teamCount} teams are already in`
    if(!int(form.squadMin)||!int(form.squadMax)||form.squadMin<1||form.squadMax>50) errors.squad='Squad sizes from 1 to 50'
    else if(Number(form.squadMin)>Number(form.squadMax)) errors.squad='Minimum can\'t be more than the maximum'
    if(!int(form.overseasMin)||!int(form.overseasMax)||form.overseasMin<0) errors.overseas='Whole numbers, 0 or more'
    else if(Number(form.overseasMin)>Number(form.overseasMax)) errors.overseas='Minimum can\'t be more than the maximum'
    else if(Number(form.overseasMax)>Number(form.squadMax)) errors.overseas='Can\'t be more than the squad maximum'
    if(!errors.purse&&!errors.squad&&Number(form.squadMin)*minPlayerPrice>purse){
        errors.purse=`Too small to buy ${form.squadMin} players at ₹${minPlayerPrice} L each`
    }
    return errors
}

export const settingsPayload=(form)=>({
    purse:Math.round(Number(form.purseCr)*100),
    timerSeconds:Number(form.timerSeconds),
    maxTeams:Number(form.maxTeams),
    rules:{
        squadMin:Number(form.squadMin),
        squadMax:Number(form.squadMax),
        overseasMin:Number(form.overseasMin),
        overseasMax:Number(form.overseasMax)
    }
})
