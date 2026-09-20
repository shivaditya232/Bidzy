import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import AdminDashboard from './pages/AdminDashboard'
import AuctionBoard from './pages/AuctionBoard'
import Results from './pages/Results'
import PastAuctions from './pages/PastAuctions'
import AuctionRoundDetail from './pages/AuctionRoundDetail'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />


      
      <Route path="/admin" element={
        <ProtectedRoute allowedRole="admin">
          <AdminDashboard />
        </ProtectedRoute>
        
      } />
      <Route path="/auction" element={
        <ProtectedRoute allowedRole="team"><AuctionBoard /></ProtectedRoute>
         }   />
      <Route path="/results" element={
        <ProtectedRoute allowedRole={['admin','team']}><Results /></ProtectedRoute>
      } />
      <Route path="/history" element={
        <ProtectedRoute allowedRole={['admin','team']}><PastAuctions /></ProtectedRoute>
      } />
      <Route path="/history/:id" element={
        <ProtectedRoute allowedRole={['admin','team']}><AuctionRoundDetail /></ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/login" replace />} />

    </Routes>
  )
}

export default App