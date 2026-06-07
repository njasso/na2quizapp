import React from 'react';

const ExamTimer = ({ timeLeft }) => (
  <div className="exam-timer">
    Temps restant : {Math.floor(timeLeft / 60)}:{timeLeft % 60}
  </div>
);

export default ExamTimer;