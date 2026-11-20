import axios from 'axios'

const api=axios.create({
    baseURL:'http://localhost:5050/api'
});
api.interceptors.request.use((config)=>{
    const token = localStorage.getItem('token');
    if(token){
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// the server always replies {message:'...'} on errors. use this in catch blocks to show it.
export const errorMessage=(err)=>err?.response?.data?.message||'Something went wrong';

export default api;