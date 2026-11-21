// All money in Bidzy is stored in lakhs (12000 = ₹120 crore), like a real IPL purse.
// formatMoney shows it the way the IPL does: crores from 1 Cr up, lakhs below.
//   formatMoney(45)    -> "₹45 L"
//   formatMoney(420)   -> "₹4.20 Cr"
//   formatMoney(200)   -> "₹2 Cr"
//   formatMoney(12000) -> "₹120 Cr"
const LAKHS_PER_CRORE=100

export const formatMoney=(lakhs)=>{
    if(typeof lakhs!=='number'||!Number.isFinite(lakhs)){
        return '—'
    }
    const sign=lakhs<0 ? '-' : ''
    const amount=Math.abs(lakhs)
    if(amount>=LAKHS_PER_CRORE){
        const crores=amount/LAKHS_PER_CRORE
        // whole crores stay clean (₹2 Cr), anything else shows two decimals (₹4.20 Cr)
        const text=Number.isInteger(crores) ? String(crores) : crores.toFixed(2)
        return `${sign}₹${text} Cr`
    }
    return `${sign}₹${Math.round(amount)} L`
}
