// Unit tests for the lobby helpers. Run with: npm test (in client/)
import {test} from 'node:test'
import assert from 'node:assert'
import {sortRooms,cleanCode,greeting,lobbyLine,roomGlow,teamTag,validateCreateRoom,createRoomPayload} from '../src/utils/lobby.js'
import {HOUSE_GLOW} from '../src/utils/color.js'

const entry=(status,extra={})=>({room:{status,name:status},myRole:'team',...extra})

test('lobby: live rooms first, finished last, server order kept inside a group',()=>{
    const rooms=[entry('ended',{id:1}),entry('lobby',{id:2}),entry('live',{id:3}),entry('lobby',{id:4})]
    assert.deepStrictEqual(sortRooms(rooms).map(r=>r.id),[3,2,4,1])
    assert.strictEqual(rooms[0].id,1) // the original list is not changed
})

test('lobby: typed or pasted codes are cleaned to 6 capitals',()=>{
    assert.strictEqual(cleanCode('hb4-c9x'),'HB4C9X')
    assert.strictEqual(cleanCode('  k7 qx 2m 99'),'K7QX2M')
    assert.strictEqual(cleanCode(''),'')
    assert.strictEqual(cleanCode(null),'')
})

test('lobby: greeting follows the time of day',()=>{
    const at=(hour)=>new Date(2026,10,22,hour)
    assert.strictEqual(greeting(at(7)),'Morning')
    assert.strictEqual(greeting(at(13)),'Afternoon')
    assert.strictEqual(greeting(at(20)),'Evening')
    assert.strictEqual(greeting(at(2)),'Evening')
})

test('lobby: the line under the greeting counts your rooms',()=>{
    assert.match(lobbyLine([]),/not in any room yet/)
    assert.strictEqual(lobbyLine([entry('live'),entry('lobby'),entry('lobby')]),'One auction is live right now. 2 more rooms are waiting in the lobby.')
    assert.strictEqual(lobbyLine([entry('lobby')]),'One room is waiting in the lobby.')
    assert.strictEqual(lobbyLine([entry('live'),entry('live')]),'2 auctions are live right now.')
    assert.strictEqual(lobbyLine([entry('ended')]),'Your auctions have all finished. Start a new one?')
})

test('lobby: card colours and tag follow who you are in the room',()=>{
    const byCode={CSK:{glow:{p:'#F9CD05',pd:'#F0A800',acc:'#1A2A8C',metal:false}}}
    assert.strictEqual(roomGlow({myRole:'host'},byCode),HOUSE_GLOW)
    assert.strictEqual(roomGlow({myRole:'team',franchise:'CSK'},byCode).p,'#F9CD05')
    assert.notStrictEqual(roomGlow({myRole:'team',color:'#14B8A6'},byCode),HOUSE_GLOW)
    assert.strictEqual(teamTag({myRole:'host'}),'HOST')
    assert.strictEqual(teamTag({myRole:'team',franchise:'MI'}),'MI')
    assert.strictEqual(teamTag({myRole:'team',teamName:'Lane 4 Lions'}),'L4L')
})

test('lobby: create-room form checks',()=>{
    const good={name:'CSE Batch',type:'ipl',purseCr:'120',timerSeconds:'15',maxTeams:'10'}
    assert.deepStrictEqual(validateCreateRoom(good),{})
    assert.ok(validateCreateRoom({...good,name:'  '}).name)
    assert.ok(validateCreateRoom({...good,purseCr:'3'}).purse) // can't buy 19 players at ₹20 L
    assert.deepStrictEqual(validateCreateRoom({...good,purseCr:'3.8'}),{})
    assert.ok(validateCreateRoom({...good,timerSeconds:'3'}).timer)
    assert.ok(validateCreateRoom({...good,maxTeams:'12'}).maxTeams) // only 10 franchises
    assert.deepStrictEqual(validateCreateRoom({...good,type:'custom',maxTeams:'12'}),{})
})

test('lobby: create-room payload sends the purse in lakhs',()=>{
    assert.deepStrictEqual(createRoomPayload({name:' CSE ',type:'ipl',purseCr:'90.5',timerSeconds:'20',maxTeams:'8'}),
        {name:'CSE',type:'ipl',settings:{purse:9050,timerSeconds:20,maxTeams:8}})
})
