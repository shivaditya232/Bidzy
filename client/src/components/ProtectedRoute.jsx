import {Navigate} from 'react-router-dom'

function ProtectedRoute({children,allowedRole}){
    const token=localStorage.getItem('token');
    const role=localStorage.getItem('role');

    if(!token){
        return <Navigate to="/login" />
    }
    if(allowedRole){
        const isAllowed=Array.isArray(allowedRole) ? allowedRole.includes(role) : role===allowedRole;
        if(!isAllowed){
            return <Navigate to="/login" />
        }
    }
    return children
}
export default ProtectedRoute