import { Outlet, Link } from 'react-router-dom';

const Layout = () => {
  return (
    <div className="app-container">
      <nav className="navbar">
        <Link to="/" className="logo-link">
          <img src="/logo.png" alt="QuizÉdu" />
        </Link>
        <div className="nav-links">
          <Link to="/quiz/educatif/primaire/Mathématiques" className="nav-link">
            Quiz Rapide
          </Link>
          <Link to="/results" className="nav-link">
            Mes Résultats
          </Link>
        </div>
      </nav>

      <main className="main-content">
        <Outlet /> {/* Ici s'afficheront les pages routées */}
      </main>

      <footer className="footer">
        © 2024 QuizÉdu - Tous droits réservés
      </footer>
    </div>
  );
};

export default Layout;