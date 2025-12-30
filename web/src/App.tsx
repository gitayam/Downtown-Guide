import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import EventPage from './pages/EventPage'
import CalendarPage from './pages/CalendarPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="events/:id" element={<EventPage />} />
        <Route path="calendar" element={<CalendarPage />} />
      </Route>
    </Routes>
  )
}

export default App
