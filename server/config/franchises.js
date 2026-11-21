//the 10 IPL franchises. in an IPL room each team picks one, and its colours are used everywhere.
//names and colours only (no logos: those are trademarks).
const FRANCHISES=[
    {code:'CSK',name:'Chennai Super Kings',primary:'#FDB913',secondary:'#0B4F9C'},
    {code:'MI',name:'Mumbai Indians',primary:'#004BA0',secondary:'#D1AB3E'},
    {code:'RCB',name:'Royal Challengers Bengaluru',primary:'#D11D26',secondary:'#1C1C1C'},
    {code:'KKR',name:'Kolkata Knight Riders',primary:'#3A225D',secondary:'#B3A123'},
    {code:'SRH',name:'Sunrisers Hyderabad',primary:'#F26522',secondary:'#1C1C1C'},
    {code:'RR',name:'Rajasthan Royals',primary:'#EA1A85',secondary:'#254AA5'},
    {code:'DC',name:'Delhi Capitals',primary:'#17449B',secondary:'#EF1B23'},
    {code:'PBKS',name:'Punjab Kings',primary:'#DD1F2D',secondary:'#A7A9AC'},
    {code:'LSG',name:'Lucknow Super Giants',primary:'#0057E2',secondary:'#F28B00'},
    {code:'GT',name:'Gujarat Titans',primary:'#1B2133',secondary:'#B09862'}
];

const FRANCHISE_CODES=FRANCHISES.map(f=>f.code);

const getFranchise=(code)=>FRANCHISES.find(f=>f.code===code)||null;

module.exports={FRANCHISES,FRANCHISE_CODES,getFranchise};
