import { teamLight } from '../../utils/color'

const KIND_CLASS={
    primary:'bz-btn bz-primary',
    secondary:'bz-btn bz-secondary',
    team:'bz-btn bz-team',
    danger:'bz-btn bz-danger',
    quiet:'bz-quiet'
}

// Bidzy's buttons are floodlights: a light bar above the label.
// The brighter the light, the more important the action.
//   primary   brightest light, one per screen
//   secondary a dimmer light beside it
//   team      the light in your team's colour (pass glow={...} from the franchise or deriveGlow)
//   danger    a red light, for things you can't take back
//   quiet     text with an underline that draws in on hover
// size="sm" for room cards, the nav and popups. arrow adds a → that nudges on hover.
// as={Link} (or 'a') to render a link that looks like a button.
//
//   <Button kind="primary" arrow onClick={create}>Create a room</Button>
//   <Button kind="team" glow={myGlow}>Start auction</Button>
function Button({ kind='primary', size='md', arrow=false, glow, as:Tag='button', className='', style, children, ...rest }) {
    const classes=[KIND_CLASS[kind]||KIND_CLASS.primary]
    if(size==='sm'&&kind!=='quiet') classes.push('bz-sm')
    if(className) classes.push(className)

    const lightStyle=kind==='team'&&glow ? {'--bz-light':teamLight(glow.p),...style} : style
    const typeProp=Tag==='button' ? {type:rest.type||'button'} : {}

    return (
        <Tag className={classes.join(' ')} style={lightStyle} {...typeProp} {...rest}>
            {children}
            {arrow && <span className="bz-arrow" aria-hidden="true">→</span>}
        </Tag>
    )
}

export default Button
