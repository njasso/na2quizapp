// src/components/QuestionNavigator.jsx
import React from 'react';

const QuestionNavigator = ({ questions, current, answers, onNavigate }) => {
  return (
    <div className="question-nav">
      {questions.map((_, index) => (
        <button
          key={index}
          className={`nav-btn ${current === index ? 'active' : ''} ${answers[questions[index].id] ? 'answered' : ''}`}
          onClick={() => onNavigate(index)}
        >
          {index + 1}
        </button>
      ))}
    </div>
  );
};

export default QuestionNavigator;