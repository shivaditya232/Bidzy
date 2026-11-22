// Unit tests for the sign-up / login checks. Run with: npm test (in client/)
import {test} from 'node:test'
import assert from 'node:assert'
import {validateSignup,validateLogin,hasErrors} from '../src/utils/validate.js'

test('sign-up: a good form has no errors',()=>{
    const errors=validateSignup({name:'Shivaditya',email:'  me@college.edu ',password:'secret1'})
    assert.deepStrictEqual(errors,{})
    assert.strictEqual(hasErrors(errors),false)
})

test('sign-up: every empty field is flagged',()=>{
    const errors=validateSignup({name:'  ',email:'',password:''})
    assert.deepStrictEqual(Object.keys(errors).sort(),['email','name','password'])
    assert.strictEqual(hasErrors(errors),true)
})

test('sign-up: bad email, short password, long name',()=>{
    assert.strictEqual(validateSignup({name:'A',email:'not-an-email',password:'secret1'}).email,"That doesn't look like an email")
    assert.strictEqual(validateSignup({name:'A',email:'a@b.co',password:'12345'}).password,'Use at least 6 characters')
    assert.match(validateSignup({name:'x'.repeat(61),email:'a@b.co',password:'secret1'}).name,/under 60/)
})

test('sign-up: odd input never crashes',()=>{
    const errors=validateSignup({name:{},email:42,password:null})
    assert.deepStrictEqual(Object.keys(errors).sort(),['email','name','password'])
})

test('login: needs an email and a password, nothing more',()=>{
    assert.deepStrictEqual(validateLogin({email:'a@b.co',password:'x'}),{},'short passwords are the server\'s call at login')
    assert.deepStrictEqual(Object.keys(validateLogin({email:'',password:''})).sort(),['email','password'])
})
