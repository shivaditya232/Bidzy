// Colour helpers for team colours, custom colours and the house glow.

const HEX=/^#[0-9A-Fa-f]{6}$/
const OKLCH=/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/
const DARK_INK='#07090D'
const LIGHT_INK='#FFFFFF'

// Bidzy's own glow, used on every page that isn't a team's (landing, sign-up, lobby...)
export const HOUSE_GLOW={p:'#1F9D5C',pd:'#0B5A37',acc:'#FFF1CF',metal:false,ink:DARK_INK}

// colours offered to teams in custom (non-IPL) rooms. each one is checked to glow well;
// any other colour can still be picked, and deriveGlow reshapes it.
export const CUSTOM_COLOURS=['#14B8A6','#A3E635','#FF9933','#FF6B4A','#E11D48','#DB2777','#8B5CF6','#4F46E5','#0EA5E9','#EAB308','#C2410C','#64748B']

const clamp=(value,low,high)=>Math.min(high,Math.max(low,value))
const toLinear=(channel)=>{
    const c=channel/255
    return c<=0.04045 ? c/12.92 : Math.pow((c+0.055)/1.055,2.4)
}

// relative luminance (WCAG) of a #RRGGBB colour, 0 = black, 1 = white
export const luminance=(hex)=>{
    const n=parseInt(hex.slice(1),16)
    const channel=(value)=>{
        const c=value/255
        return c<=0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055,2.4)
    }
    return 0.2126*channel((n>>16)&255)+0.7152*channel((n>>8)&255)+0.0722*channel(n&255)
}

// #RRGGBB -> {L, C, H} in OKLCH (perceptual: equal steps look equal to the eye)
export const hexToOklch=(hex)=>{
    const n=parseInt(hex.slice(1),16)
    const r=toLinear((n>>16)&255)
    const g=toLinear((n>>8)&255)
    const b=toLinear(n&255)
    const l=Math.cbrt(0.4122214708*r+0.5363325363*g+0.0514459929*b)
    const m=Math.cbrt(0.2119034982*r+0.6806995451*g+0.1073969566*b)
    const s=Math.cbrt(0.0883024619*r+0.2817188376*g+0.6299787005*b)
    const L=0.2104542553*l+0.7936177850*m-0.0040720468*s
    const A=1.9779984951*l-2.4285922050*m+0.4505937099*s
    const B=0.0259040371*l+0.7827717662*m-0.8086757660*s
    let H=Math.atan2(B,A)*180/Math.PI
    if(H<0){
        H+=360
    }
    return {L,C:Math.hypot(A,B),H}
}

const toCss=(L,C,H)=>`oklch(${L.toFixed(3)} ${C.toFixed(3)} ${H.toFixed(1)})`

// read a #RRGGBB or an oklch(L C H) string back into {L, C, H}; null if it's neither
export const parseColor=(color)=>{
    if(typeof color!=='string'){
        return null
    }
    if(HEX.test(color)){
        return hexToOklch(color)
    }
    const match=color.match(OKLCH)
    if(match){
        return {L:Number(match[1]),C:Number(match[2]),H:Number(match[3])}
    }
    return null
}

// text colour to put ON a colour: dark ink on light colours (CSK yellow), white on dark ones (MI blue)
export const inkOn=(color)=>{
    if(typeof color==='string'&&HEX.test(color)){
        return luminance(color)>0.32 ? DARK_INK : LIGHT_INK
    }
    const parsed=parseColor(color)
    if(!parsed){
        return LIGHT_INK
    }
    return parsed.L>0.72 ? DARK_INK : LIGHT_INK
}

// any colour a custom team picks -> a glow that always looks good:
//   p   the colour, lifted if too dark (so it glows) or calmed if too bright (easy on the eyes)
//   pd  a deeper shade of the same hue, for depth
//   acc a soft light tint of the same hue, as the small accent
// greys stay grey instead of being forced into a colour.
export const deriveGlow=(hex)=>{
    if(typeof hex!=='string'||!HEX.test(hex)){
        return HOUSE_GLOW
    }
    const {L,C,H}=hexToOklch(hex)
    const isGrey=C<0.035
    const pL=clamp(L,0.58,0.80)
    const pC=isGrey ? Math.min(C,0.02) : clamp(C,0.09,0.20)
    return {
        p:toCss(pL,pC,H),
        pd:toCss(Math.max(pL-0.21,0.32),pC*0.9,H),
        acc:toCss(0.93,isGrey ? 0.01 : Math.min(pC*0.3,0.05),H),
        metal:false,
        ink:pL>0.72 ? DARK_INK : LIGHT_INK
    }
}

// the colour a team's button light shines in. dark brand colours (MI blue, KKR purple, GT navy)
// are brightened for the light so they still shine on the night base.
export const teamLight=(color)=>{
    const parsed=parseColor(color)
    if(!parsed){
        return '#FFF1CF'
    }
    return toCss(Math.max(parsed.L,0.68),parsed.C,parsed.H)
}

// CSS variables that paint something in a team's colours. glow = {p, pd, acc, metal, ink?}
// (from the server for franchises, from deriveGlow for custom teams).
// Use as style={teamStyle(glow)}; children read var(--team-p) etc.
export const teamStyle=(glow)=>{
    if(!glow){
        return {}
    }
    return {
        '--team-p':glow.p,
        '--team-pd':glow.pd,
        '--team-acc':glow.acc,
        // gold is drawn as metal wherever it's solid
        '--team-acc-solid':glow.metal ? 'var(--gold-metal)' : glow.acc,
        '--team-ink':glow.ink||inkOn(glow.p)
    }
}
