import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import Field from '../components/ui/Field'
import Button from '../components/ui/Button'
import PasswordToggle from '../components/PasswordToggle'
import { login, isLoggedIn, logout } from '../api/auth'
import { homeAfterLogin } from '../api/rooms'
import { validateLogin, hasErrors } from '../utils/validate'

const readLoginError=(err)=>{
    if(!err.response){
        return "Can't reach Bidzy right now. Check your connection and try again."
    }
    const message=err.response.data?.message||''
    if(/invalid email or password/i.test(message)){
        return "That email and password don't match. Try again."
    }
    return message||'Something went wrong. Try again.'
}

function Login(){
    const navigate=useNavigate()
    const [form,setForm]=useState({email:'',password:''})
    const [touched,setTouched]=useState({})
    const [submitted,setSubmitted]=useState(false)
    const [serverError,setServerError]=useState('')
    const [busy,setBusy]=useState(false)
    const [showPassword,setShowPassword]=useState(false)

    // already logged in? skip this page
    useEffect(()=>{
        if(!isLoggedIn()) return
        homeAfterLogin()
            .then(path=>navigate(path,{replace:true}))
            .catch(()=>logout())
    },[navigate])

    const errors=validateLogin(form)
    const errorFor=(field)=>(touched[field]||submitted) ? errors[field] : undefined

    const update=(field)=>(e)=>{
        setForm(prev=>({...prev,[field]:e.target.value}))
        setServerError('')
    }
    const leave=(field)=>()=>setTouched(prev=>({...prev,[field]:true}))

    const handleSubmit=async(e)=>{
        e.preventDefault()
        setSubmitted(true)
        if(hasErrors(errors)){
            const first=['email','password'].find(f=>errors[f])
            document.getElementById(`login-${first}`)?.focus()
            return
        }
        setBusy(true)
        try{
            await login({email:form.email.trim(),password:form.password})
            navigate(await homeAfterLogin(),{replace:true})
        }
        catch(err){
            setServerError(readLoginError(err))
            setBusy(false)
        }
    }

    return (
        <AuthLayout title="Welcome back" subtitle="Log in to get back to your rooms.">
            <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
                <Field id="login-email" label="Email" type="email" inputMode="email" value={form.email} onChange={update('email')} onBlur={leave('email')}
                    error={errorFor('email')} autoComplete="email" placeholder="you@college.edu" />
                <Field id="login-password" label="Password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={update('password')} onBlur={leave('password')}
                    error={errorFor('password')} autoComplete="current-password"
                    after={<PasswordToggle shown={showPassword} onToggle={()=>setShowPassword(s=>!s)} />} />

                {serverError && <p role="alert" className="m-0 rounded-xl bg-alert/10 px-3.5 py-2.5 text-sm text-alert">{serverError}</p>}

                <Button kind="primary" type="submit" className="mt-1 w-full" aria-busy={busy}>
                    {busy ? 'Checking…' : 'Log in'}
                </Button>
                <p className="m-0 text-center text-sm text-fg-2">
                    New here? <Link to="/signup" className="font-semibold text-fg underline underline-offset-[3px]">Make an account</Link>
                </p>
            </form>
        </AuthLayout>
    )
}

export default Login
