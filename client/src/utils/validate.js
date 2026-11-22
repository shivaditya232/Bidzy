// Form checks for sign-up and login. They mirror the server's rules (server/controllers/authController.js),
// so most mistakes are caught before a request is sent. The server still checks everything.
// Each returns an object of field -> message; empty object = no problems.

const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD=6
const MAX_NAME=60

const checkEmail=(email)=>{
    const value=typeof email==='string' ? email.trim() : ''
    if(!value){
        return 'Enter your email'
    }
    if(!EMAIL.test(value)){
        return "That doesn't look like an email"
    }
    return null
}

export const validateSignup=({name,email,password})=>{
    const errors={}
    const cleanName=typeof name==='string' ? name.trim() : ''
    if(!cleanName){
        errors.name='Enter your name'
    }
    else if(cleanName.length>MAX_NAME){
        errors.name=`Keep it under ${MAX_NAME} characters`
    }
    const emailProblem=checkEmail(email)
    if(emailProblem){
        errors.email=emailProblem
    }
    if(typeof password!=='string'||password.length===0){
        errors.password='Choose a password'
    }
    else if(password.length<MIN_PASSWORD){
        errors.password=`Use at least ${MIN_PASSWORD} characters`
    }
    return errors
}

export const validateLogin=({email,password})=>{
    const errors={}
    const emailProblem=checkEmail(email)
    if(emailProblem){
        errors.email=emailProblem
    }
    if(typeof password!=='string'||password.length===0){
        errors.password='Enter your password'
    }
    return errors
}

export const hasErrors=(errors)=>Object.keys(errors).length>0
