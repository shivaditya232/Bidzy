const Player=require('../models/Player');

//overseas = has a country and it isn't the room's home country (case doesn't matter)
const isOverseas=(player,rules)=>{
    if(!player||typeof player.country!=='string'||!player.country.trim()) return false;
    return player.country.trim().toLowerCase()!==rules.homeCountry.trim().toLowerCase();
};

//how many players a team has bought in this room, and how many of them are overseas
const getSquad=async (roomId,memberId,rules)=>{
    const bought=await Player.find({room:roomId,soldTo:memberId,status:'sold'}).select('country');
    return {
        size:bought.length,
        overseas:bought.filter(p=>isOverseas(p,rules)).length
    };
};

//every team's squad in one query: { membershipId: {size, overseas} }. teams with no players aren't in it.
const getRoomSquads=async (roomId,rules)=>{
    const sold=await Player.find({room:roomId,status:'sold'}).select('country soldTo');
    const squads={};
    for(const p of sold){
        const key=p.soldTo.toString();
        if(!squads[key]) squads[key]={size:0,overseas:0};
        squads[key].size++;
        if(isOverseas(p,rules)) squads[key].overseas++;
    }
    return squads;
};

//can this team bid `amount` on `player`? returns null if yes, otherwise the reason.
//pure function: no database, so it's easy to test.
//  rules  = room.settings.rules
//  squad  = {size, overseas} the team has already bought
//  purseRemaining = the team's purse right now
const checkBid=({rules,squad,player,purseRemaining,amount})=>{
    const overseas=isOverseas(player,rules);

    //1. squad max
    if(squad.size>=rules.squadMax){
        return `Your squad is full (${rules.squadMax} players)`;
    }
    //2. overseas max
    if(overseas&&squad.overseas>=rules.overseasMax){
        return `You already have the maximum ${rules.overseasMax} overseas players`;
    }

    //what the squad would look like if this bid wins
    const sizeAfter=squad.size+1;
    const overseasAfter=squad.overseas+(overseas ? 1 : 0);
    const spotsLeft=rules.squadMax-sizeAfter;

    //3. overseas min: buying a home player must still leave room to reach the overseas minimum
    const overseasStillNeeded=Math.max(0,rules.overseasMin-overseasAfter);
    if(overseasStillNeeded>spotsLeft){
        return `Keep ${overseasStillNeeded} squad spots for overseas players`;
    }

    //4. purse reserve: after paying, you must still afford the players you still need (at the cheapest price)
    const playersStillNeeded=Math.max(rules.squadMin-sizeAfter,overseasStillNeeded,0);
    const reserve=playersStillNeeded*rules.minPlayerPrice;
    if(purseRemaining-amount<reserve){
        return `Bid too high: keep ${reserve} in your purse for the ${playersStillNeeded} more players you need`;
    }

    return null;
};

module.exports={isOverseas,getSquad,getRoomSquads,checkBid};
