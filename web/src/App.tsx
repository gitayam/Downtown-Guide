import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import EventPage from './pages/EventPage'
import AboutPage from './pages/AboutPage'
import ApiDocsPage from './pages/ApiDocsPage'
import CalendarPage from './pages/CalendarPage'
import PlanDatePage from './pages/PlanDatePage'
import LunarNewYearPage from './pages/LunarNewYearPage'
import Layout from './components/Layout'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="events/:id" element={<EventPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="plan-date" element={<PlanDatePage />} />
        <Route path="lunar-new-year" element={<LunarNewYearPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="api" element={<ApiDocsPage />} />
        <Route path="api-docs" element={<ApiDocsPage />} />
      </Route>
    </Routes>
  )
}

export default App
