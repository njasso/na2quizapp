import { Routes, Route } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import StatisticsPage from './pages/StatisticsPage';
import AIGeneratorPage from './pages/AIGeneratorPage';
import ComposeQuizPage from './pages/ComposeQuizPage';
import PrintResultsPage from './pages/PrintResultsPage';
import HomePage from './pages/HomePage';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/dashboard" element={<DashboardPage />}>
        <Route path="statistiques" element={<StatisticsPage />} />
        <Route path="generation-ia" element={<AIGeneratorPage />} />
        <Route path="composer" element={<ComposeQuizPage />} />
        <Route path="impression" element={<PrintResultsPage />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;
