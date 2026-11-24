// Unit tests for the host screen helpers. Run with: npm test (in client/)
import {test} from 'node:test'
import assert from 'node:assert'
import {groupBySet,startChecks,canStart,auctionProgress,teamSummaries,biggestBuy,emptyPlayerForm,playerToForm,validatePlayer,playerPayload,settingsToForm,validateSettings,settingsPayload} from '../src/utils/host.js'

const sets=[{_id:'s2',name:'Bowlers',sequence:2},{_id:'s1',name:'Marquee',sequence:1},{_id:'s3',name:'Empty',sequence:3}]
const players=[
    {_id:'a',set:{_id:'s1'},status:'sold',soldPrice:1450,soldTo:{_id:'t1'}},
    {_id:'b',set:'s1',status:'live'},
    {_id:'c',set:'s2',status:'pending'},
    {_id:'d',set:'s2',status:'unsold'},
    {_id:'e',set:'s2',status:'sold',soldPrice:1950,soldTo:'t2'}
]

test('host: players grouped under their set, sets in order, empty sets kept',()=>{
    const groups=groupBySet(players,sets)
    assert.deepStrictEqual(groups.map(g=>g.set.name),['Marquee','Bowlers','Empty'])
    assert.deepStrictEqual(groups[0].players.map(p=>p._id),['a','b'])
    assert.strictEqual(groups[2].players.length,0)
})

test('host: start needs 2 teams and a player waiting',()=>{
    assert.strictEqual(canStart([{},{}],[{status:'pending'}]),true)
    assert.strictEqual(canStart([{}],[{status:'pending'}]),false)
    assert.strictEqual(canStart([{},{}],[{status:'sold'}]),false)
    assert.deepStrictEqual(startChecks([{}],[]).map(c=>c.text),['Need 2 teams (1 in)','Add at least 1 player'])
})

test('host: progress, team summaries and the biggest buy',()=>{
    assert.deepStrictEqual(auctionProgress(players,'b'),{lot:2,total:5,sold:2,unsold:1,spent:3400})
    const summary=teamSummaries([{_id:'t1'},{_id:'t2'},{_id:'t3'}],players)
    assert.deepStrictEqual(summary.map(s=>[s.bought.length,s.spent]),[[1,1450],[1,1950],[0,0]])
    assert.strictEqual(biggestBuy(players)._id,'e')
    assert.strictEqual(biggestBuy([]),null)
})

test('host: player form checks and payload',()=>{
    const form={...emptyPlayerForm('s1'),name:' Shubman Gill ',stats:{matches:'103',runs:'3216',wickets:'9'}}
    assert.deepStrictEqual(validatePlayer(form),{})
    assert.ok(validatePlayer({...form,name:''}).name)
    assert.ok(validatePlayer({...form,set:''}).set)
    assert.ok(validatePlayer({...form,image:'not a link'}).image)
    assert.ok(validatePlayer({...form,stats:{runs:'-4'}}).runs)
    const payload=playerPayload(form)
    assert.strictEqual(payload.name,'Shubman Gill')
    // only a batsman's stats are sent (wickets is dropped), empty ones become 0
    assert.deepStrictEqual(payload.stats,{matches:103,runs:3216,battingAverage:0,strikeRate:0})
    const back=playerToForm({name:'X',role:'Bowler',country:'India',basePrice:50,set:{_id:'s2'},stats:{wickets:12,runs:0}})
    assert.deepStrictEqual([back.set,back.stats],['s2',{wickets:'12'}])
})

test('host: settings in crores on screen, lakhs on the server',()=>{
    const form=settingsToForm({purse:12000,timerSeconds:15,maxTeams:10,rules:{squadMin:19,squadMax:25,overseasMin:5,overseasMax:8}})
    assert.strictEqual(form.purseCr,'120')
    assert.deepStrictEqual(validateSettings(form),{})
    assert.ok(validateSettings({...form,maxTeams:'12'}).maxTeams)
    assert.strictEqual(validateSettings({...form,maxTeams:'12'},{teamCount:11,type:'custom'}).maxTeams,undefined) // custom rooms go up to 20
    assert.ok(validateSettings({...form,maxTeams:'3'},{teamCount:4}).maxTeams)
    assert.ok(validateSettings({...form,squadMin:'30'}).squad)
    assert.ok(validateSettings({...form,overseasMax:'30'}).overseas)
    assert.ok(validateSettings({...form,purseCr:'3'}).purse) // 19 x ₹20 L doesn't fit in ₹3 Cr
    assert.deepStrictEqual(settingsPayload({...form,purseCr:'90.5'}).purse,9050)
})
