//the 10 IPL franchises. in an IPL room each team picks one, and its colours are used everywhere.
//names and colours only (no logos: those are trademarks).
//
//primary / secondary : the brand colours (published palettes). primary is the team's colour in the room.
//glow                : how the app paints the team (agreed design):
//   p     the primary that owns the screen
//   pd    a deeper shade of the same primary, for depth
//   acc   the small accent colour
//   metal true when the accent is gold: drawn as metal wherever it's solid
const GOLD='#F0B93A';

const FRANCHISES=[
    {code:'CSK',name:'Chennai Super Kings',primary:'#F9CD05',secondary:'#0A1172',glow:{p:'#F9CD05',pd:'#F0A800',acc:'#1A2A8C',metal:false}},
    {code:'MI',name:'Mumbai Indians',primary:'#004BA0',secondary:'#B49759',glow:{p:'#0B57C0',pd:'#003C8F',acc:GOLD,metal:true}},
    {code:'RCB',name:'Royal Challengers Bengaluru',primary:'#EC1C24',secondary:'#B49759',glow:{p:'#EC1C24',pd:'#A80E16',acc:GOLD,metal:true}},
    {code:'KKR',name:'Kolkata Knight Riders',primary:'#3A225D',secondary:'#B3A123',glow:{p:'#6B3FA0',pd:'#3A225D',acc:GOLD,metal:true}},
    {code:'SRH',name:'Sunrisers Hyderabad',primary:'#FF822A',secondary:'#000000',glow:{p:'#FF822A',pd:'#E2530F',acc:'#FFB37A',metal:false}},
    {code:'RR',name:'Rajasthan Royals',primary:'#EA1A85',secondary:'#254AA5',glow:{p:'#F0258F',pd:'#BE1270',acc:'#2D5BD0',metal:false}},
    {code:'DC',name:'Delhi Capitals',primary:'#17479E',secondary:'#ED1C24',glow:{p:'#2257D6',pd:'#17479E',acc:'#F0262E',metal:false}},
    {code:'PBKS',name:'Punjab Kings',primary:'#DD1F2D',secondary:'#A7A8AA',glow:{p:'#EC1F2F',pd:'#B3121F',acc:'#E9E4D8',metal:false}},
    {code:'LSG',name:'Lucknow Super Giants',primary:'#00A2E0',secondary:'#FF7D19',glow:{p:'#00A2E0',pd:'#0068B3',acc:'#FF7D19',metal:false}},
    {code:'GT',name:'Gujarat Titans',primary:'#1C2C43',secondary:'#DBBE6E',glow:{p:'#2C4A78',pd:'#1C2C43',acc:GOLD,metal:true}}
];

const FRANCHISE_CODES=FRANCHISES.map(f=>f.code);

const getFranchise=(code)=>FRANCHISES.find(f=>f.code===code)||null;

module.exports={FRANCHISES,FRANCHISE_CODES,getFranchise};
