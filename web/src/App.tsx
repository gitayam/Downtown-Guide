import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import EventPage from './pages/EventPage'
import AboutPage from './pages/AboutPage'
import ApiDocsPage from './pages/ApiDocsPage'
import CalendarPage from './pages/CalendarPage'
import PlanDatePage from './pages/PlanDatePage'
import Layout from './components/Layout'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="events/:id" element={<EventPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="plan-date" element={<PlanDatePage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="api-docs" element={<ApiDocsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
