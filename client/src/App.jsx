import { Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import AdminDashboard from './pages/AdminDashboard'
import AuctionBoard from './pages/AuctionBoard'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      

      
      <Route path="/admin" element={
        <ProtectedRoute allowedRole="admin">
          <AdminDashboard />
        </ProtectedRoute>
        
      } />
      <Route path="/auction" element={
        <ProtectedRoute allowedRole="team"><AuctionBoard /></ProtectedRoute>
         }   />
      
    </Routes>
  )
}

export default App