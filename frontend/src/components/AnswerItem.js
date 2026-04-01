import React from 'react';

const AnswerItem = ({ 
  answer, 
  isSelected, 
  onSelect 
}) => {
  return (
    <div 
      onClick={() => onSelect(!isSelected)}
      className={`p-3 rounded-xl border transition-all duration-200 ${
        isSelected 
          ? 'bg-blue-900 border-blue-400' 
          : 'bg-gray-900 border-gray-600 hover:bg-gray-700 cursor-pointer'
      }`}
    >
      <div className="flex items-center">
        <div className={`w-6 h-6 rounded-md mr-3 flex items-center justify-center ${
          isSelected ? 'bg-blue-500' : 'border border-gray-400'
        }`}>
          {isSelected && (
            <span className="text-white text-sm">✓</span>
          )}
        </div>
        <span>{answer.text}</span>
      </div>
    </div>
  );
};

export default AnswerItem;