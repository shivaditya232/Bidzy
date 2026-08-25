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
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md w-80">
                <h1 className="text-2xl font-bold mb-6 text-center">Bidzy Login</h1>
                {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}

                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                    type="email"
                    value={email}
                    onChange={(e)=>{setEmail(e.target.value)}}
                    required
                    className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
                />

                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                    type="password"
                    value={password}
                    onChange={(e)=>{setPassword(e.target.value)}}
                    required
                    className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
                />

                <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                >
                    Log In
                </button>
            </form>
        </div>
    );
}

export default Login;
