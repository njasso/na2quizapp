import React from 'react';
import { Link } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';

const NavBar = () => {
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          QuizCameroon
        </Typography>
        <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
          <Button color="inherit" component={Link} to="/">
            Accueil
          </Button>
          <Button color="inherit" component={Link} to="/manual-quiz">
            Création Manuelle
          </Button>
          <Button color="inherit" component={Link} to="/database-quiz">
            Importation CSV
          </Button>
          <Button color="inherit" component={Link} to="/ai-quiz">
            Génération IA
          </Button>
          <Button color="inherit" component={Link} to="/exams">
            Épreuves
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default NavBar;