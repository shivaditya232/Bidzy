import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import AdminDashboard from './pages/AdminDashboard'
import AuctionBoard from './pages/AuctionBoard'
import Results from './pages/Results'
import PastAuctions from './pages/PastAuctions'
import AuctionRoundDetail from './pages/AuctionRoundDetail'
import RoomGuard from './components/RoomGuard'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />

      {/* everything inside a room. the room comes from the URL, the guard checks you're in it */}
      <Route path="/rooms/:roomId/host" element={
        <RoomGuard allowedRole="host"><AdminDashboard /></RoomGuard>
      } />
      <Route path="/rooms/:roomId/board" element={
        <RoomGuard allowedRole="team"><AuctionBoard /></RoomGuard>
      } />
      <Route path="/rooms/:roomId/results" element={
        <RoomGuard><Results /></RoomGuard>
      } />
      <Route path="/rooms/:roomId/history" element={
        <RoomGuard><PastAuctions /></RoomGuard>
      } />
      <Route path="/rooms/:roomId/history/:id" element={
        <RoomGuard><AuctionRoundDetail /></RoomGuard>
      } />
      <Route path="*" element={<Navigate to="/login" replace />} />

    </Routes>
  )
}

export default App
