// src/components/ExamCard.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

const ExamCard = ({ exam, onStart }) => {
  const navigate = useNavigate();
  
  return (
    <div className="exam-card">
      <h3>{exam.metadata.subject}</h3>
      <div className="exam-meta">
        <span className="domain-badge">{exam.metadata.domaine}</span>
        <span className="level-tag">{exam.metadata.level}</span>
      </div>
      <div className="exam-details">
        <p>Catégorie : {exam.metadata.category}</p>
        <p>Nombre de questions : {exam.questions.length}</p>
        <p>Durée : {exam.metadata.duration} minutes</p>
      </div>
      <button 
        className="start-btn"
        onClick={() => navigate(`/exam/${exam.id}/compose`)}
      >
        Commencer l'épreuve
      </button>
    </div>
  );
};

export default ExamCard;