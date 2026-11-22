// Unit tests for the pure client helpers. Run with: npm test (in client/)
import {test} from 'node:test'
import assert from 'node:assert'
import {formatMoney} from '../src/utils/money.js'
import {inkOn,luminance,teamStyle,deriveGlow,teamLight,parseColor,hexToOklch,HOUSE_GLOW,CUSTOM_COLOURS} from '../src/utils/color.js'

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

// ---------- custom colours, house glow, team lights ----------
test('oklch: known colours land where expected',()=>{
    const white=hexToOklch('#FFFFFF')
    assert.ok(Math.abs(white.L-1)<0.001 && white.C<0.001)
    const black=hexToOklch('#000000')
    assert.ok(black.L<0.001)
    assert.deepStrictEqual(parseColor('oklch(0.700 0.130 182.5)'),{L:0.7,C:0.13,H:182.5})
    assert.strictEqual(parseColor('nope'),null)
})

test('deriveGlow: a very dark colour is lifted so it glows',()=>{
    const g=deriveGlow('#0A1440') // near-black navy
    assert.ok(parseColor(g.p).L>=0.58)
    assert.ok(parseColor(g.pd).L<parseColor(g.p).L,'deep shade is darker than the main colour')
})

test('deriveGlow: a very bright colour is calmed so it is easy on the eyes',()=>{
    const g=deriveGlow('#F0FF40') // neon yellow
    assert.ok(parseColor(g.p).L<=0.80)
    assert.ok(parseColor(g.p).C<=0.20)
    assert.strictEqual(g.ink,'#07090D','light colour gets dark text')
})

test('deriveGlow: greys stay grey, and the hue is kept',()=>{
    const grey=deriveGlow('#808080')
    assert.ok(parseColor(grey.p).C<=0.02)
    const teal=deriveGlow('#14B8A6')
    assert.ok(Math.abs(parseColor(teal.p).H-hexToOklch('#14B8A6').H)<0.2,'same hue as picked')
    assert.strictEqual(teal.metal,false)
})

test('deriveGlow: bad input falls back to the house glow',()=>{
    assert.deepStrictEqual(deriveGlow('red'),HOUSE_GLOW)
    assert.deepStrictEqual(deriveGlow(undefined),HOUSE_GLOW)
})

test('every offered custom colour produces a valid glow',()=>{
    assert.strictEqual(CUSTOM_COLOURS.length,12)
    for(const hex of CUSTOM_COLOURS){
        const g=deriveGlow(hex)
        for(const key of ['p','pd','acc']){
            assert.ok(parseColor(g[key]),`${hex} ${key} is a colour`)
        }
    }
})

test('teamLight: dark brand colours are brightened, bright ones kept',()=>{
    assert.ok(parseColor(teamLight('#0B57C0')).L>=0.68,'MI blue lifted')
    const csk=hexToOklch('#F9CD05')
    assert.ok(Math.abs(parseColor(teamLight('#F9CD05')).L-csk.L)<0.001,'CSK yellow unchanged')
    assert.strictEqual(teamLight('nope'),'#FFF1CF')
})
