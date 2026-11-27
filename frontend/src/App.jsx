import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import HistoryPage from './pages/HistoryPage.jsx';
import NewOrderPage from './pages/NewOrderPage.jsx';
import PreparingPage from './pages/PreparingPage.jsx';
import QueuePage from './pages/QueuePage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="new" element={<NewOrderPage />} />
        <Route path="queue" element={<QueuePage />} />
        <Route path="preparing" element={<PreparingPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="*" element={<MissingPage />} />
      </Route>
    </Routes>
  );
}

function MissingPage() {
  return (
    <section className="page">
      <h1>Page not found</h1>
      <p className="lede">That section is not part of the kitchen board.</p>
    </section>
  );
}
