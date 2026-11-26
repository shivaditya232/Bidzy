// Unit tests for the IPL pack picker and the photo crop maths. Run with: npm test (in client/)
import {test} from 'node:test'
import assert from 'node:assert'
import {groupsInRoom,pickSummary,toggleGroup,coverScale,clampOffset,dataUrlKb,creditLine} from '../src/utils/pack.js'

const groups=[
    {name:'Marquee',sets:['Marquee'],count:16},
    {name:'Batters',sets:['Batters 1','Batters 2'],count:20},
    {name:'Uncapped',sets:['Uncapped 1'],count:63}
]

test('pack: summary counts players, sets and a rough running time',()=>{
    assert.deepStrictEqual(pickSummary(groups,['Marquee','Batters']),{count:36,sets:3,line:'in 3 sets · about 27 min at 45 s a player'})
    assert.strictEqual(pickSummary(groups,['Marquee','Batters','Uncapped']).line,'in 4 sets · about 1 h 14 min at 45 s a player')
    assert.strictEqual(pickSummary(groups,[]).line,'Pick at least one set')
})

test('pack: toggle a group on and off',()=>{
    assert.deepStrictEqual(toggleGroup(['Marquee'],'Batters'),['Marquee','Batters'])
    assert.deepStrictEqual(toggleGroup(['Marquee','Batters'],'Marquee'),['Batters'])
})

test('pack: a group is in the room once one of its sets has players',()=>{
    const roomSets=[{_id:'a',name:'Marquee'},{_id:'b',name:'Batters 2'},{_id:'c',name:'Uncapped 1'}]
    const players=[{set:{_id:'a'}},{set:'b'}]
    assert.deepStrictEqual(groupsInRoom(groups,roomSets,players),['Marquee','Batters'])
})

test('photo: cover scale fills the square on the short side',()=>{
    assert.strictEqual(coverScale(300,600,400),0.75)
    assert.strictEqual(coverScale(300,400,600),0.75)
})

test('photo: offsets are clamped so no corner is empty',()=>{
    const frame={box:300,width:400,height:600,scale:0.75}   // shown at 300 x 450
    assert.deepStrictEqual(clampOffset({x:50,y:-500},frame),{x:0,y:-75})
    assert.deepStrictEqual(clampOffset({x:0,y:40},frame),{x:0,y:40})
})

test('photo: data URL size and credit line',()=>{
    assert.strictEqual(dataUrlKb('data:image/webp;base64,'+'A'.repeat(4096)),3)
    assert.strictEqual(dataUrlKb(''),0)
    assert.strictEqual(creditLine({author:'RIGI',license:'CC BY 3.0'}),'RIGI · CC BY 3.0')
    assert.strictEqual(creditLine({author:'Asha'}),'Asha')
    assert.strictEqual(creditLine(null),'')
})
