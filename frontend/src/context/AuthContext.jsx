import { createContext,useContext,useState } from 'react';
import api from '../services/api';
const AuthContext=createContext(null);
export function AuthProvider({children}){const [user,setUser]=useState(()=>{try{return JSON.parse(localStorage.getItem('erp_user'))}catch{return null}});const login=async(email,password)=>{const {data}=await api.post('/auth/login',{email,password});localStorage.setItem('erp_token',data.token);localStorage.setItem('erp_user',JSON.stringify(data.user));setUser(data.user);return data};const logout=()=>{localStorage.removeItem('erp_token');localStorage.removeItem('erp_user');setUser(null)};return <AuthContext.Provider value={{user,login,logout}}>{children}</AuthContext.Provider>}
export const useAuth=()=>useContext(AuthContext);
