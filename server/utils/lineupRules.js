const {isOverseas}=require('./auctionRules');

const XI_SIZE=11;
//real IPL rule: at most 4 overseas players in the playing XI (backups don't count)
const XI_OVERSEAS_MAX=4;

//checks a team's XI. pure function: no database, so it's easy to test.
//  lineup = 11 positions, each {player: id|null, backups: [ids]}
//  bought = the players this team owns: [{_id, country}]
//  rules  = room.settings.rules (for homeCountry)
//returns {error} or {lineup} (cleaned: ids as strings, missing backups as [])
const validateLineup=(lineup,bought,rules)=>{
    if(!Array.isArray(lineup)||lineup.length!==XI_SIZE){
        return {error:`The XI must have exactly ${XI_SIZE} positions`};
    }
    const owned=new Map(bought.map(p=>[p._id.toString(),p]));
    const starters=new Set();
    const clean=[];

    for(let i=0;i<XI_SIZE;i++){
        const slot=lineup[i];
        const position=i+1;
        if(slot===null||typeof slot!=='object'||Array.isArray(slot)){
            return {error:`Position ${position} is not valid`};
        }
        const starter=slot.player===null||slot.player===undefined ? null : String(slot.player);
        const backups=slot.backups===undefined ? [] : slot.backups;
        if(!Array.isArray(backups)){
            return {error:`Position ${position}: backups must be a list`};
        }
        const backupIds=backups.map(String);

        if(starter!==null){
            if(!owned.has(starter)){
                return {error:`Position ${position}: that player isn't in your squad`};
            }
            if(starters.has(starter)){
                return {error:'A player can bat in only one position'};
            }
            starters.add(starter);
        }
        //a backup has to back up someone
        if(backupIds.length>0&&starter===null){
            return {error:`Position ${position} has backups but no starter to back up`};
        }
        if(new Set(backupIds).size!==backupIds.length){
            return {error:`Position ${position}: the same backup is listed twice`};
        }
        for(const id of backupIds){
            if(!owned.has(id)){
                return {error:`Position ${position}: that backup isn't in your squad`};
            }
        }
        clean.push({player:starter,backups:backupIds});
    }

    //checked after the loop, because the starter may be placed at a later position
    for(const slot of clean){
        for(const id of slot.backups){
            if(starters.has(id)){
                return {error:"A player in the XI can't also be a backup"};
            }
        }
    }

    let overseasStarters=0;
    for(const id of starters){
        if(isOverseas(owned.get(id),rules)) overseasStarters++;
    }
    if(overseasStarters>XI_OVERSEAS_MAX){
        return {error:`Only ${XI_OVERSEAS_MAX} overseas players can be in the XI (you have ${overseasStarters})`};
    }

    return {lineup:clean};
};

//bought players who are neither starting nor backing anyone up yet
const getUnplaced=(lineup,bought)=>{
    const placed=new Set();
    for(const slot of lineup){
        if(slot.player) placed.add(slot.player.toString());
        for(const id of slot.backups) placed.add(id.toString());
    }
    return bought.map(p=>p._id.toString()).filter(id=>!placed.has(id));
};

module.exports={XI_SIZE,XI_OVERSEAS_MAX,validateLineup,getUnplaced};
