import React from 'react';

const ResultCard = ({ title, value, color, description }) => {
  const colorMap = {
    correct: 'bg-gradient-to-br from-teal-600 to-teal-500',
    incorrect: 'bg-gradient-to-br from-red-600 to-red-500',
    unanswered: 'bg-gradient-to-br from-gray-600 to-gray-500'
  };

  const iconMap = {
    correct: '✅',
    incorrect: '❌',
    unanswered: '❓'
  };

  return (
    <div className={`p-5 rounded-2xl shadow-lg ${colorMap[color]} text-center border border-gray-700`}>
      <div className="text-2xl mb-2">{iconMap[color]}</div>
      <h3 className="text-lg font-bold text-gray-200">{title}</h3>
      <p className="text-3xl mt-1 font-semibold text-gray-100">{value}</p>
      {description && (
        <p className="text-sm mt-2 text-gray-200 opacity-90">{description}</p>
      )}
    </div>
  );
};

export default ResultCard;