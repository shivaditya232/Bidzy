// Colour helpers for team colours.

const HEX=/^#[0-9A-Fa-f]{6}$/
const DARK_INK='#07090D'
const LIGHT_INK='#FFFFFF'

// relative luminance (WCAG) of a #RRGGBB colour, 0 = black, 1 = white
export const luminance=(hex)=>{
    const n=parseInt(hex.slice(1),16)
    const channel=(value)=>{
        const c=value/255
        return c<=0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055,2.4)
    }
    return 0.2126*channel((n>>16)&255)+0.7152*channel((n>>8)&255)+0.0722*channel(n&255)
}

// text colour to put ON a team colour: dark ink on light colours (CSK yellow), white on dark ones (MI blue)
export const inkOn=(hex)=>{
    if(typeof hex!=='string'||!HEX.test(hex)){
        return LIGHT_INK
    }
    return luminance(hex)>0.32 ? DARK_INK : LIGHT_INK
}

// CSS variables that paint something in a team's colours. glow comes from the server:
// {p, pd, acc, metal}. Use as style={teamStyle(glow)} on any element; children read var(--team-p) etc.
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
        '--team-ink':inkOn(glow.p)
    }
}
