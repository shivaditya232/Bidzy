import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from '../api/axios';

function Login(){
    const [email,setEmail]=useState('');
    const [password,setPassword]=useState('');
    const [error,setError]=useState('');
    const navigate=useNavigate();

    const handleSubmit=async(e)=>{
        e.preventDefault();
        setError('');
        try{
            const res=await api.post('auth/login',{email,password});
            const token=res.data.token;
            const role=res.data.user.role;

            localStorage.setItem('token',token);
            localStorage.setItem('role',role);

            if(role==='admin'){
                navigate('/admin');
            }
            else{
                navigate('/auction');
            }
        }
        catch(err){
            setError('Login Failed');
        }
    }
    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-950">
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">

                <div className="text-center mb-7">
                    <span className="inline-flex h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 items-center justify-center text-white font-display font-bold text-lg shadow-md shadow-indigo-500/30 mb-3">
                        B
                    </span>
                    <h1 className="font-display font-bold text-2xl text-slate-800">Bidzy</h1>
                    <p className="text-sm text-slate-400 mt-1">Sign in to continue</p>
                </div>

                {error && <p className="text-red-600 text-sm mb-4 text-center bg-red-50 rounded-lg py-2">{error}</p>}

                <div style={{marginBottom:'18px'}}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e)=>{setEmail(e.target.value)}}
                        required
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
                    />
                </div>

                <div style={{marginBottom:'24px'}}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e)=>{setPassword(e.target.value)}}
                        required
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
                    />
                </div>

                <button
                    type="submit"
                    className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-semibold shadow-md shadow-indigo-500/25 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all"
                >
                    Log In
                </button>
            </form>
        </div>
    );
}

export default Login;
