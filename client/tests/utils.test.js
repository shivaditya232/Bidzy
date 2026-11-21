// Unit tests for the pure client helpers. Run with: npm test (in client/)
import {test} from 'node:test'
import assert from 'node:assert'
import {formatMoney} from '../src/utils/money.js'
import {inkOn,luminance,teamStyle} from '../src/utils/color.js'

test('money: lakhs below 1 crore',()=>{
    assert.strictEqual(formatMoney(45),'₹45 L')
    assert.strictEqual(formatMoney(20),'₹20 L')
    assert.strictEqual(formatMoney(0),'₹0 L')
    assert.strictEqual(formatMoney(99),'₹99 L')
})

test('money: crores from 1 Cr up, whole crores stay clean',()=>{
    assert.strictEqual(formatMoney(100),'₹1 Cr')
    assert.strictEqual(formatMoney(200),'₹2 Cr')
    assert.strictEqual(formatMoney(420),'₹4.20 Cr')
    assert.strictEqual(formatMoney(1435),'₹14.35 Cr')
    assert.strictEqual(formatMoney(12000),'₹120 Cr')
    assert.strictEqual(formatMoney(2675),'₹26.75 Cr')
})

test('money: odd input never crashes',()=>{
    assert.strictEqual(formatMoney(undefined),'—')
    assert.strictEqual(formatMoney(NaN),'—')
    assert.strictEqual(formatMoney('420'),'—')
    assert.strictEqual(formatMoney(-150),'-₹1.50 Cr')
})

test('colour: dark ink on light team colours, white on dark ones',()=>{
    assert.strictEqual(inkOn('#F9CD05'),'#07090D','CSK yellow gets dark text')
    assert.strictEqual(inkOn('#0B57C0'),'#FFFFFF','MI blue gets white text')
    assert.strictEqual(inkOn('#EC1C24'),'#FFFFFF','RCB red gets white text')
    assert.strictEqual(inkOn('#FF822A'),'#07090D','SRH orange gets dark text')
    assert.strictEqual(inkOn('nope'),'#FFFFFF','bad input falls back to white')
})

test('colour: luminance ends',()=>{
    assert.strictEqual(luminance('#000000'),0)
    assert.ok(Math.abs(luminance('#FFFFFF')-1)<1e-9)
})

test('teamStyle: gold accents become metal, others stay flat',()=>{
    const mi=teamStyle({p:'#0B57C0',pd:'#003C8F',acc:'#F0B93A',metal:true})
    assert.strictEqual(mi['--team-acc-solid'],'var(--gold-metal)')
    assert.strictEqual(mi['--team-ink'],'#FFFFFF')
    const csk=teamStyle({p:'#F9CD05',pd:'#F0A800',acc:'#1A2A8C',metal:false})
    assert.strictEqual(csk['--team-acc-solid'],'#1A2A8C')
    assert.deepStrictEqual(teamStyle(null),{})
})
