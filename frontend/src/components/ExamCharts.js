import { Box, Typography } from '@mui/material';
import { Bar, Pie } from 'react-chartjs-2';

const ExamCharts = ({ exam }) => {
  // Logique de génération des graphiques...
  
  return (
    <>
      <Typography variant="h6" gutterBottom>
        Analyse des Résultats
      </Typography>
      <Box sx={{ height: 300, mb: 4 }}>
        <Bar data={barData} options={barOptions} />
      </Box>
      <Box sx={{ height: 300 }}>
        <Pie data={pieData} options={pieOptions} />
      </Box>
    </>
  );
};

export default ExamCharts;