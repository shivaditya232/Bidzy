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
        <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden px-4">
            <div className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-indigo-200/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-violet-200/20 blur-3xl" />

            <form onSubmit={handleSubmit} className="relative bg-white p-8 rounded-2xl ring-1 ring-slate-900/5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_20px_40px_-16px_rgba(15,23,42,0.2)] w-80">
                <div className="flex flex-col items-center mb-6">
                    <span className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-display font-bold text-lg shadow-md shadow-indigo-500/30 mb-3">
                        B
                    </span>
                    <h1 className="font-display font-bold text-xl text-slate-800">Bidzy</h1>
                    <p className="text-xs text-slate-400 mt-0.5">Sign in to continue</p>
                </div>

                {error && <p className="text-red-600 text-sm mb-4 text-center bg-red-50 rounded-lg py-2">{error}</p>}

                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                    type="email"
                    value={email}
                    onChange={(e)=>{setEmail(e.target.value)}}
                    required
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 mb-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
                />

                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input
                    type="password"
                    value={password}
                    onChange={(e)=>{setPassword(e.target.value)}}
                    required
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 mb-5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
                />

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
