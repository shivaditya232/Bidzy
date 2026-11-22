import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import Field from '../components/ui/Field'
import Button from '../components/ui/Button'
import PasswordToggle from '../components/PasswordToggle'
import { signup, isLoggedIn, logout } from '../api/auth'
import { homeAfterLogin } from '../api/rooms'
import { validateSignup, hasErrors } from '../utils/validate'

// turn a failed request into a message next to the right field (or above the button)
const readSignupError=(err)=>{
    if(!err.response){
        return {form:"Can't reach Bidzy right now. Check your connection and try again."}
    }
    const message=err.response.data?.message||''
    if(/already exists/i.test(message)){
        return {email:'That email already has an account.',emailTaken:true}
    }
    return {form:message||'Something went wrong. Try again.'}
}

function Signup(){
    const navigate=useNavigate()
    const [form,setForm]=useState({name:'',email:'',password:''})
    const [touched,setTouched]=useState({})
    const [submitted,setSubmitted]=useState(false)
    const [serverError,setServerError]=useState({})
    const [busy,setBusy]=useState(false)
    const [showPassword,setShowPassword]=useState(false)

    // already logged in? skip this page
    useEffect(()=>{
        if(!isLoggedIn()) return
        homeAfterLogin()
            .then(path=>navigate(path,{replace:true}))
            .catch(()=>logout())
    },[navigate])

    const errors=validateSignup(form)
    // show a field's problem once you've left it (or tried to submit); server problems always show
    const errorFor=(field)=>serverError[field]||((touched[field]||submitted) ? errors[field] : undefined)

    const update=(field)=>(e)=>{
        setForm(prev=>({...prev,[field]:e.target.value}))
        setServerError({})
    }
    const leave=(field)=>()=>setTouched(prev=>({...prev,[field]:true}))

    const handleSubmit=async(e)=>{
        e.preventDefault()
        setSubmitted(true)
        if(hasErrors(errors)){
            const first=['name','email','password'].find(f=>errors[f])
            document.getElementById(`signup-${first}`)?.focus()
            return
        }
        setBusy(true)
        try{
            await signup({name:form.name.trim(),email:form.email.trim(),password:form.password})
            navigate(await homeAfterLogin(),{replace:true})
        }
        catch(err){
            setServerError(readSignupError(err))
            setBusy(false)
        }
    }

    return (
        <AuthLayout title="Make your account" subtitle="Then create a room or join one with a code.">
            <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
                <Field id="signup-name" label="Name" value={form.name} onChange={update('name')} onBlur={leave('name')}
                    error={errorFor('name')} autoComplete="name" placeholder="Shivaditya" />
                <div className="grid gap-1">
                    <Field id="signup-email" label="Email" type="email" inputMode="email" value={form.email} onChange={update('email')} onBlur={leave('email')}
                        error={errorFor('email')} autoComplete="email" placeholder="you@college.edu" />
                    {serverError.emailTaken && <Link to="/login" className="w-max text-[13px] text-fg underline underline-offset-[3px]">Log in instead</Link>}
                </div>
                <Field id="signup-password" label="Password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={update('password')} onBlur={leave('password')}
                    error={errorFor('password')} hint="At least 6 characters" autoComplete="new-password"
                    after={<PasswordToggle shown={showPassword} onToggle={()=>setShowPassword(s=>!s)} />} />

                {serverError.form && <p role="alert" className="m-0 rounded-xl bg-alert/10 px-3.5 py-2.5 text-sm text-alert">{serverError.form}</p>}

                <Button kind="primary" type="submit" className="mt-1 w-full" aria-busy={busy}>
                    {busy ? 'Checking…' : 'Create account'}
                </Button>
                <p className="m-0 text-center text-sm text-fg-2">
                    Already have one? <Link to="/login" className="font-semibold text-fg underline underline-offset-[3px]">Log in</Link>
                </p>
            </form>
        </AuthLayout>
    )
}

export default Signup
