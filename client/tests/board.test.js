// Unit tests for the auction board helpers. Run with: npm test (in client/)
import {test} from 'node:test'
import assert from 'node:assert'
import {bidStep,nextBid,statsFor,isOverseas,initials,idOf,xiSlots,placeInFirstOpen,upcomingPlayers,boughtByTeam} from '../src/utils/board.js'

const BANDS=[{upTo:100,step:5},{upTo:200,step:10},{upTo:500,step:20},{upTo:null,step:25}]

test('board: next bid follows the room price bands (same as the server)',()=>{
    assert.strictEqual(bidStep(50,BANDS),5)
    assert.strictEqual(bidStep(100,BANDS),10)
    assert.strictEqual(bidStep(499,BANDS),20)
    assert.strictEqual(bidStep(1425,BANDS),25)
    assert.strictEqual(nextBid(200,BANDS),220)
    assert.strictEqual(nextBid(1425,BANDS),1450)
})

test('board: stats shown depend on the role',()=>{
    const stats={matches:10,runs:300,battingAverage:30,strikeRate:140,wickets:12,bowlingEconomy:7.5}
    assert.deepStrictEqual(statsFor({role:'Batsman',stats}).map(s=>s[0]),['Matches','Runs','Average','Strike rate'])
    assert.deepStrictEqual(statsFor({role:'Bowler',stats}).map(s=>s[1]),[10,12,7.5,300])
    assert.deepStrictEqual(statsFor({role:'Allrounder',stats}).map(s=>s[0]),['Matches','Runs','Wickets','Strike rate'])
    assert.deepStrictEqual(statsFor({role:'Wicketkeeper'}).map(s=>s[1]),[0,0,0,0])
})

test('board: overseas, initials, ids',()=>{
    assert.strictEqual(isOverseas({country:'Afghanistan'},'India'),true)
    assert.strictEqual(isOverseas({country:'india'},'India'),false)
    assert.strictEqual(isOverseas({},'India'),false)
    assert.strictEqual(initials('MS Dhoni'),'MD')
    assert.strictEqual(initials(''),'?')
    assert.strictEqual(idOf({_id:'a1'}),'a1')
    assert.strictEqual(idOf('b2'),'b2')
    assert.strictEqual(idOf(null),'')
})

test('board: XI slots look players up and keep open slots',()=>{
    const byId={p1:{_id:'p1',name:'One'},p2:{_id:'p2',name:'Two'}}
    const slots=xiSlots([{player:'p1',backups:['p2']},{player:null,backups:[]}],byId)
    assert.strictEqual(slots.length,11)
    assert.strictEqual(slots[0].player.name,'One')
    assert.strictEqual(slots[0].backups[0].name,'Two')
    assert.strictEqual(slots[1].player,null)
    assert.strictEqual(slots[10].position,11)
})

test('board: a won player drops into the first open slot',()=>{
    const lineup=[{player:'p1',backups:['p9']},{player:null,backups:[]},{player:'p3',backups:[]}]
    const next=placeInFirstOpen(lineup,'p7')
    assert.strictEqual(next.length,11)
    assert.strictEqual(next[1].player,'p7')
    assert.deepStrictEqual(next[0],{player:'p1',backups:['p9']})
    assert.strictEqual(placeInFirstOpen(next,'p7'),null) // already in
    assert.strictEqual(placeInFirstOpen(lineup,'p9'),null) // already a backup
    const full=Array.from({length:11},(_,i)=>({player:'x'+i,backups:[]}))
    assert.strictEqual(placeInFirstOpen(full,'p7'),null)
})

test('board: upcoming players and who bought whom',()=>{
    const players=[
        {_id:'a',status:'sold',soldTo:{_id:'t1',teamName:'CSK'}},
        {_id:'b',status:'live'},
        {_id:'c',status:'pending'},
        {_id:'d',status:'sold',soldTo:'t2'},
        {_id:'e',status:'pending'},
        {_id:'f',status:'unsold'}
    ]
    assert.deepStrictEqual(upcomingPlayers(players).map(p=>p._id),['c','e'])
    const byTeam=boughtByTeam(players)
    assert.deepStrictEqual(Object.keys(byTeam).sort(),['t1','t2'])
    assert.strictEqual(byTeam.t1[0]._id,'a')
})
