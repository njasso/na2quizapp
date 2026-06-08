// src/components/Sidebar.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const Sidebar = () => {
  return (
    <div className="w-64 h-full bg-blue-800 text-white flex flex-col p-4">
      <h2 className="text-2xl font-bold mb-8">Quiz Admin</h2>
      <nav className="flex flex-col gap-4">
        <Link to="/dashboard" className="hover:text-yellow-300">🏠 Accueil</Link>
        <Link to="/statistiques" className="hover:text-yellow-300">📊 Statistiques</Link>
        <Link to="/generation-ia" className="hover:text-yellow-300">🤖 Générateur IA</Link>
        <Link to="/composer" className="hover:text-yellow-300">📝 Composer</Link>
        <Link to="/impression" className="hover:text-yellow-300">🖨️ Impression</Link>
      </nav>
    </div>
  );
};

export default Sidebar;
