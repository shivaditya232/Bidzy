// Auth tests for A3.1. Run with: npm test
// Uses its own database (bidzy_test_auth) so it can run in parallel with the other test files.
const path=require('path');
require('dotenv').config({path:path.join(__dirname,'..','.env'),quiet:true});
const {test,before,after}=require('node:test');
const assert=require('node:assert');
const mongoose=require('mongoose');
const jwt=require('jsonwebtoken');

const User=require('../models/User');
const {registerUser,loginUser}=require('../controllers/authController');
const {protect}=require('../middleware/authMiddleware');

const TEST_DB='bidzy_test_auth';

// call a controller with a fake req/res, resolve with {code, body}
const call=(handler,body,headers={})=>new Promise((resolve)=>{
    const res={
        code:200,
        status(code){ this.code=code; return this; },
        json(body){ resolve({code:this.code,body}); }
    };
    handler({body,headers},res);
});

// run protect; resolve with {passed:true, user} if it called next(), otherwise the error response
const runProtect=(token)=>new Promise((resolve)=>{
    const req={headers:token ? {authorization:'Bearer '+token} : {}};
    const res={
        code:200,
        status(code){ this.code=code; return this; },
        json(body){ resolve({passed:false,code:this.code,body}); }
    };
    protect(req,res,()=>resolve({passed:true,user:req.user}));
});

before(async()=>{
    await mongoose.connect(process.env.MONGO_URI,{dbName:TEST_DB});
    assert.strictEqual(mongoose.connection.name,TEST_DB,'refusing to run outside the test database');
    await User.deleteMany({});
    await User.syncIndexes(); // make sure the unique email index exists in the fresh test db
});

after(async()=>{
    await mongoose.disconnect();
});

test('sign-up creates a plain account and logs you in',async()=>{
    const r=await call(registerUser,{name:'Asha',email:'  Asha@Example.com ',password:'secret1'});
    assert.strictEqual(r.code,201);
    assert.ok(r.body.token,'should return a token');
    assert.strictEqual(r.body.user.email,'asha@example.com','email is trimmed and lowercased');
    assert.deepStrictEqual(Object.keys(r.body.user).sort(),['email','id','name'],'only id, name and email come back');

    const decoded=jwt.verify(r.body.token,process.env.JWT_SECRET);
    assert.deepStrictEqual(Object.keys(decoded).filter(k=>!['iat','exp'].includes(k)),['id'],'token carries only the id');
});

test('sign-up ignores role, teamName and purse from the body',async()=>{
    const r=await call(registerUser,{name:'Sneaky',email:'sneaky@example.com',password:'secret1',role:'admin',teamName:'X',purse:999999});
    assert.strictEqual(r.code,201);
    // read the raw document: none of these fields may be stored at all
    const raw=await User.collection.findOne({email:'sneaky@example.com'});
    assert.strictEqual(raw.role,undefined,'role must not be settable');
    assert.strictEqual(raw.teamName,undefined);
    assert.strictEqual(raw.purse,undefined);
    assert.strictEqual(raw.purseRemaining,undefined);
});

test('sign-up validation',async()=>{
    const missing=await call(registerUser,{email:'a@b.com',password:'secret1'});
    assert.strictEqual(missing.code,400);
    const badEmail=await call(registerUser,{name:'A',email:'not-an-email',password:'secret1'});
    assert.strictEqual(badEmail.code,400);
    const shortPw=await call(registerUser,{name:'A',email:'short@example.com',password:'123'});
    assert.strictEqual(shortPw.code,400);
    const objectEmail=await call(registerUser,{name:'A',email:{$gt:''},password:'secret1'});
    assert.strictEqual(objectEmail.code,400,'objects in place of strings are rejected');
});

test('same email signed up 10 times at once: exactly one account',async()=>{
    const results=await Promise.all(Array.from({length:10},()=>
        call(registerUser,{name:'Racer',email:'racer@example.com',password:'secret1'})
    ));
    assert.strictEqual(results.filter(r=>r.code===201).length,1);
    assert.strictEqual(results.filter(r=>r.code===400).length,9);
    assert.strictEqual(await User.countDocuments({email:'racer@example.com'}),1);
});

test('login works with any email casing and rejects a wrong password',async()=>{
    const ok=await call(loginUser,{email:'ASHA@example.com',password:'secret1'});
    assert.strictEqual(ok.code,200);
    assert.ok(ok.body.token);
    const bad=await call(loginUser,{email:'asha@example.com',password:'wrong'});
    assert.strictEqual(bad.code,400);
});

test('protect: only the id is trusted, and the account must still exist',async()=>{
    const user=await User.create({name:'Legacy',email:'legacy@example.com',password:'x'});
    // an old-style token that also claims a role: the extra claim is ignored
    const oldToken=jwt.sign({id:user._id,role:'admin'},process.env.JWT_SECRET);
    const r=await runProtect(oldToken);
    assert.strictEqual(r.passed,true);
    assert.deepStrictEqual(r.user,{id:user._id.toString()},'req.user is just the id');

    await User.deleteOne({_id:user._id});
    const gone=await runProtect(oldToken);
    assert.strictEqual(gone.passed,false);
    assert.strictEqual(gone.code,401,'deleted account is rejected straight away');
});

test('protect rejects missing and forged tokens',async()=>{
    assert.strictEqual((await runProtect(null)).code,401);
    const forged=jwt.sign({id:new mongoose.Types.ObjectId()},'not-the-real-secret');
    assert.strictEqual((await runProtect(forged)).code,401);
});
