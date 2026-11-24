// Unit tests for the results / past-auction helpers. Run with: npm test (in client/)
import {test} from 'node:test'
import assert from 'node:assert'
import {liveSheets,totals,roundSheets,roundTotals,teamByName,numberRounds,xiRows} from '../src/utils/results.js'

const teams=[{_id:'t1',teamName:'Chennai Super Kings',franchise:'CSK',purse:12000,purseRemaining:9600},{_id:'t2',teamName:'Lane 4 Lions',color:'#14B8A6',purse:12000,purseRemaining:12000}]
const players=[
    {_id:'a',status:'sold',soldPrice:400,soldTo:{_id:'t1'}},
    {_id:'b',status:'sold',soldPrice:2000,soldTo:'t1'},
    {_id:'c',status:'unsold'},
    {_id:'d',status:'pending'}
]

test('results: one sheet per team, buys most expensive first',()=>{
    const sheets=liveSheets(teams,players)
    assert.deepStrictEqual(sheets[0].squad.map(p=>p._id),['b','a'])
    assert.deepStrictEqual([sheets[0].spent,sheets[0].left],[2400,9600])
    assert.deepStrictEqual([sheets[1].squad.length,sheets[1].spent],[0,0])
    assert.deepStrictEqual(totals(players),{sold:2,unsold:1,spent:2400})
})

test('results: a saved round grouped by team name, with its totals and top buy',()=>{
    const results=[
        {playerName:'MS Dhoni',status:'sold',soldPrice:1450,teamName:'Chennai Super Kings'},
        {playerName:'Virat Kohli',status:'sold',soldPrice:1950,teamName:'Mumbai Indians'},
        {playerName:'Ravindra Jadeja',status:'sold',soldPrice:1600,teamName:'Chennai Super Kings'},
        {playerName:'Glenn Maxwell',status:'unsold'}
    ]
    const sheets=roundSheets(results)
    assert.deepStrictEqual(sheets.map(s=>s.team.teamName),['Chennai Super Kings','Mumbai Indians']) // most spent first
    assert.deepStrictEqual(sheets[0].squad.map(p=>p.name),['Ravindra Jadeja','MS Dhoni'])
    const t=roundTotals(results)
    assert.deepStrictEqual([t.sold,t.unsold,t.spent,t.top.playerName],[3,1,5000,'Virat Kohli'])
    assert.strictEqual(roundTotals([]).top,null)
})

test('results: team colours found by name, rounds numbered oldest = 1',()=>{
    assert.strictEqual(teamByName('Lane 4 Lions',teams).color,'#14B8A6')
    assert.strictEqual(teamByName('Mumbai Indians',teams,[{code:'MI',name:'Mumbai Indians'}]).franchise,'MI')
    assert.deepStrictEqual(teamByName('Old Team',teams,[]),{teamName:'Old Team'})
    assert.deepStrictEqual(numberRounds([{_id:'new'},{_id:'mid'},{_id:'old'}]).map(r=>r.number),[3,2,1])
})

test('results: an XI always has 11 rows, empty spots stay null',()=>{
    const rows=xiRows([{player:{name:'Rohit'},backups:[{name:'Naman'}]},{player:null,backups:[]}])
    assert.strictEqual(rows.length,11)
    assert.strictEqual(rows[0].backups[0].name,'Naman')
    assert.strictEqual(rows[1].player,null)
    assert.strictEqual(rows[10].position,11)
})
