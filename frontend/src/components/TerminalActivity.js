import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography } from '@mui/material';

const TerminalActivity = ({ exam, terminals }) => {
  const filteredTerminals = terminals.filter(t => 
    exam?.terminals?.includes(t.ip)
  );

  return (
    <>
      <Typography variant="h6" gutterBottom>
        Activité des Terminaux ({filteredTerminals.length} connectés)
      </Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Adresse IP</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell>Progression</TableCell>
              <TableCell>Dernière activité</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredTerminals.map((terminal) => (
              <TableRow key={terminal.ip}>
                <TableCell>{terminal.ip}</TableCell>
                <TableCell>
                  <span style={{ 
                    color: terminal.status === 'active' ? 'green' : 'gray'
                  }}>
                    {terminal.status}
                  </span>
                </TableCell>
                <TableCell>
                  {terminal.progress || '0%'}
                </TableCell>
                <TableCell>
                  {new Date(terminal.lastActivity).toLocaleTimeString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};

export default TerminalActivity;