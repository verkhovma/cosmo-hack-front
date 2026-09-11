import { NavLink, Route, Routes } from "react-router-dom";
import DesignerPage from "./pages/DesignerPage";
import ComparePage from "./pages/ComparePage";
import ProjectsPage from "./pages/ProjectsPage";
import { JobsProvider } from "./JobsContext";

export default function App() {
  return (
    <JobsProvider>
      <div className="app">
        <header className="app-header">
          <h1>КосмоХакатон 2026 — Проектирование группировки</h1>
          <nav>
            <NavLink to="/" end>Проектирование</NavLink>
            <NavLink to="/compare">Сравнение</NavLink>
            <NavLink to="/projects">Проекты</NavLink>
          </nav>
        </header>
        <main className="app-main">
          <Routes>
            <Route path="/" element={<DesignerPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/projects" element={<ProjectsPage />} />
          </Routes>
        </main>
      </div>
    </JobsProvider>
  );
}