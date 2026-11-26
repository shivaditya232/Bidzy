//The ready-made IPL 2026 player pack: what the host picks from, and the plan for loading it into a room.
//Pure functions (no database), so they're easy to test.

//one entry per group of sets ("Batters" = Batters 1..4), in auction order
const packGroups=(pack)=>{
    const groups=[];
    for(const set of pack.sets){
        let group=groups.find(g=>g.name===set.group);
        if(!group){
            group={name:set.group,sets:[],count:0,photos:0};
            groups.push(group);
        }
        group.sets.push(set.name);
        group.count+=set.count;
    }
    for(const player of pack.players){
        const set=pack.sets.find(s=>s.name===player.set);
        const group=set&&groups.find(g=>g.name===set.group);
        if(group&&player.image) group.photos++;
    }
    return groups;
};

//what the host sees before loading: the groups, and how many players/photos in all
const packSummary=(pack)=>({
    about:pack.about,
    license:pack.license,
    total:pack.players.length,
    photos:pack.players.filter(p=>p.image).length,
    groups:packGroups(pack)
});

const nameKey=(name)=>String(name).trim().toLowerCase();

//plan a load into a room.
//   groups: the group names the host picked
//   roomSets: [{_id, name, sequence, playerCount}] already in the room
//   roomPlayerNames: names of players already in the room (they're skipped, so loading twice adds nobody twice)
//   defaultSetNames: the sets every new room starts with; empty ones are dropped so they don't sit between the pack's sets
//returns {error} or {dropSetIds, newSets:[{name, sequence}], players:[{...player, set: <set name>}], skipped}
const planPackLoad=({pack,groups,roomSets,roomPlayerNames,defaultSetNames})=>{
    const known=new Set(packGroups(pack).map(g=>g.name));
    const picked=Array.isArray(groups) ? [...new Set(groups.filter(g=>known.has(g)))] : [];
    if(picked.length===0){
        return {error:'Pick at least one set to load'};
    }
    const packSets=pack.sets.filter(s=>picked.includes(s.group)).map(s=>s.name);

    //an empty starter set ("Batsman Set 1"...) goes, unless the pack is about to fill a set of that name
    const dropSetIds=roomSets
        .filter(s=>s.playerCount===0&&defaultSetNames.includes(s.name)&&!packSets.includes(s.name))
        .map(s=>s._id);
    const kept=roomSets.filter(s=>!dropSetIds.includes(s._id));

    let sequence=kept.reduce((most,s)=>Math.max(most,s.sequence),0);
    const newSets=[];
    for(const name of packSets){
        if(!kept.some(s=>s.name===name)){
            sequence++;
            newSets.push({name,sequence});
        }
    }

    const taken=new Set(roomPlayerNames.map(nameKey));
    const players=[];
    let skipped=0;
    for(const player of pack.players){
        if(!packSets.includes(player.set)) continue;
        if(taken.has(nameKey(player.name))){
            skipped++;
            continue;
        }
        taken.add(nameKey(player.name));
        players.push({
            name:player.name,
            role:player.role,
            country:player.country,
            basePrice:player.basePrice,
            stats:player.stats,
            image:player.image||undefined,
            imageCredit:player.imageCredit||undefined,
            roleGuessed:Boolean(player.roleGuessed),
            set:player.set
        });
    }
    return {dropSetIds,newSets,players,skipped};
};

module.exports={packGroups,packSummary,planPackLoad};
