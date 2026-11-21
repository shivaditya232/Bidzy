import { useEffect, useState } from 'react'
import { getFranchises } from '../api/rooms'

// The 10 franchises with their colours, loaded once from the server (one source of truth)
// and shared by every component that asks.
//   const { franchises, byCode, loading, error } = useFranchises()
//   byCode.CSK.glow -> {p, pd, acc, metal}
let cache=null
let pending=null

const load=()=>{
    if(cache) return Promise.resolve(cache)
    if(!pending){
        pending=getFranchises()
            .then(list=>{
                cache=list
                return list
            })
            .finally(()=>{ pending=null })
    }
    return pending
}

export const useFranchises=()=>{
    const [state,setState]=useState({franchises:cache||[],loading:!cache,error:null})

    useEffect(()=>{
        if(cache) return
        let cancelled=false
        load()
            .then(list=>{ if(!cancelled) setState({franchises:list,loading:false,error:null}) })
            .catch(err=>{ if(!cancelled) setState({franchises:[],loading:false,error:err}) })
        return ()=>{ cancelled=true }
    },[])

    const byCode=Object.fromEntries(state.franchises.map(f=>[f.code,f]))
    return {...state,byCode}
}
