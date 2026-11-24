import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeLineup, planDrop, applyDrop, addBackup, removeBackup, moveBackup, balance, powerStat, handOf, backingUp, XI_OVERSEAS_MAX } from '../src/utils/xi.js'

const P=(id,role,country='India',stats={})=>({_id:id,name:`First ${id.toUpperCase()}`,role,country,stats})
const squad=[P('a','Batsman'),P('b','Batsman'),P('k','Wicketkeeper'),P('r','Allrounder'),P('w','Bowler'),
    P('o1','Batsman','Australia'),P('o2','Bowler','England'),P('o3','Bowler','New Zealand'),P('o4','Allrounder','Afghanistan'),P('o5','Batsman','South Africa')]
const byId=Object.fromEntries(squad.map(p=>[p._id,p]))
const opts={byId,homeCountry:'India'}
const empty=()=>normalizeLineup([])
const withStarters=(...ids)=>{ const x=empty(); ids.forEach((id,i)=>{ x[i].player=id }); return x }

test('normalizeLineup: 11 clean slots from populated or partial data', () => {
    const x=normalizeLineup([{player:{_id:'a'},backups:[{_id:'b'}]},{player:null,backups:['k']}])
    assert.equal(x.length,11)
    assert.deepEqual(x[0],{player:'a',backups:['b']})
    assert.deepEqual(x[1],{player:null,backups:[]}) // backups need a starter
})

test('planDrop labels each kind of drop', () => {
    const x=withStarters('a','b')
    assert.equal(planDrop(x,'k',{kind:'place',i:4},opts).label,'Bat at 5')
    assert.equal(planDrop(x,'k',{kind:'swap',i:0},opts).label,'Swap with A')
    assert.equal(planDrop(x,'k',{kind:'tuck',i:1},opts).label,'Back up B')
    assert.equal(planDrop(x,'a',{kind:'hand'},opts).label,'Take out')
    assert.equal(planDrop(x,'k',{kind:'hand'},opts),null)          // already in the hand
    assert.equal(planDrop(x,'a',{kind:'swap',i:0},opts),null)       // onto himself
})

test('planDrop refuses a 5th overseas starter but allows swapping one overseas for another', () => {
    const x=withStarters('o1','o2','o3','o4')
    const refused=planDrop(x,'o5',{kind:'place',i:6},opts)
    assert.equal(refused.ok,false)
    assert.equal(refused.overseas,true)
    assert.equal(planDrop(x,'o5',{kind:'swap',i:0},opts).ok,true)
    assert.equal(planDrop(x,'o5',{kind:'tuck',i:0},opts).ok,true)   // backups don't count
    assert.equal(XI_OVERSEAS_MAX,4)
})

test('planDrop: a starter cannot be tucked in as a backup', () => {
    const x=withStarters('a','b')
    assert.equal(planDrop(x,'a',{kind:'tuck',i:1},opts).ok,false)
})

test('applyDrop from the hand takes the spot and its backups; the old starter goes back', () => {
    let x=withStarters('a')
    x=addBackup(x,0,'k')
    x=applyDrop(x,'b',{kind:'swap',i:0})
    assert.deepEqual(x[0],{player:'b',backups:['k']})
    assert.deepEqual(handOf(squad,x).map(p=>p._id).includes('a'),true)
})

test('applyDrop between two starters swaps them with their backups', () => {
    let x=withStarters('a','b')
    x=addBackup(x,0,'k')
    x=applyDrop(x,'b',{kind:'swap',i:0})
    assert.deepEqual(x[0],{player:'b',backups:[]})
    assert.deepEqual(x[1],{player:'a',backups:['k']})
})

test('a backup who starts stops being a backup; taking a starter out drops his backups', () => {
    let x=withStarters('a','b')
    x=applyDrop(x,'k',{kind:'tuck',i:0})
    x=applyDrop(x,'k',{kind:'tuck',i:1})
    assert.deepEqual(backingUp(x,'k'),[1,2])
    x=applyDrop(x,'k',{kind:'place',i:5})
    assert.deepEqual(backingUp(x,'k'),[])
    x=applyDrop(x,'r',{kind:'tuck',i:0})
    x=applyDrop(x,'a',{kind:'hand'})
    assert.deepEqual(x[0],{player:null,backups:[]})
})

test('applyDrop does not change the lineup it was given', () => {
    const x=withStarters('a')
    applyDrop(x,'b',{kind:'place',i:3})
    assert.equal(x[3].player,null)
})

test('backups can be added once, reordered and removed', () => {
    let x=withStarters('a')
    x=addBackup(x,0,'k'); x=addBackup(x,0,'r'); x=addBackup(x,0,'k')
    assert.deepEqual(x[0].backups,['k','r'])
    x=moveBackup(x,0,1,-1)
    assert.deepEqual(x[0].backups,['r','k'])
    assert.deepEqual(moveBackup(x,0,0,-1)[0].backups,['r','k']) // already first
    x=removeBackup(x,0,'r')
    assert.deepEqual(x[0].backups,['k'])
    assert.deepEqual(addBackup(empty(),2,'k')[2].backups,[]) // no starter, no backup
})

test('balance: allrounders count half; keeper and bowling options', () => {
    const b=balance(withStarters('a','b','r','w','k'),byId)
    assert.equal(b.bat,3.5)
    assert.equal(b.bowl,1.5)
    assert.equal(b.lean,'Batting heavy')
    assert.equal(b.keeper,true)
    assert.equal(b.bowlingOptions,2)
    assert.equal(b.placed,5)
})

test('powerStat picks the number that matters for the role', () => {
    assert.deepEqual(powerStat(P('x','Bowler','India',{wickets:165})),{label:'WKT',value:165})
    assert.deepEqual(powerStat(P('x','Batsman','India',{strikeRate:131})),{label:'SR',value:131})
    assert.deepEqual(powerStat(P('x','Batsman','India',{battingAverage:38.7})),{label:'AVG',value:38.7})
    assert.deepEqual(powerStat(P('x','Bowler')),{label:'WKT',value:'–'})
})
