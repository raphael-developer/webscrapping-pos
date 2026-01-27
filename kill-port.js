const { exec } = require('child_process');

const port = process.argv[2] || 3000;

exec(`netstat -ano | findstr :${port}`, (err, stdout) => {
  if (stdout) {
    const lines = stdout.split('\n');
    const pids = [...new Set(lines
      .filter(line => line.includes('LISTENING'))
      .map(line => line.trim().split(/\s+/).pop())
      .filter(pid => pid && pid !== '0')
    )];
    
    pids.forEach(pid => {
      exec(`taskkill /PID ${pid} /F`, (err) => {
        if (!err) console.log(`Processo ${pid} na porta ${port} finalizado`);
      });
    });
  } else {
    console.log(`Nenhum processo encontrado na porta ${port}`);
  }
});