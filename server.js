const express = require("express");
const trf1Service = require("./trf1Service");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

/**
 * Health Check Endpoint
 * GET /health
 */
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

/**
 * Status do Serviço
 * GET /api/status
 */
app.get("/api/status", (req, res) => {
  res.json({
    pronto: trf1Service.isReady(),
    mensagem: trf1Service.isReady()
      ? "Serviço pronto para consultas"
      : "Serviço não inicializado",
  });
});

/**
 * Inicializar o Serviço
 * POST /api/inicializar
 */
app.post("/api/inicializar", async (req, res) => {
  try {
    await trf1Service.initialize();
    res.json({
      sucesso: true,
      mensagem: "Serviço inicializado com sucesso",
    });
  } catch (error) {
    res.status(500).json({
      sucesso: false,
      mensagem: `Erro ao inicializar: ${error.message}`,
    });
  }
});

/**
 * Consultar Processo
 * POST /api/consultar
 * Body: { secao: string, proc: string, uf: string }
 */
app.post("/api/consultar", async (req, res) => {
  try {
    const { secao, proc, uf } = req.body;

    // Validação
    if (!secao || !proc || !uf) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Parâmetros obrigatórios: secao, proc, uf",
      });
    }

    // Garantir que o serviço está inicializado
    if (!trf1Service.isReady()) {
      await trf1Service.initialize();
    }

    // Consultar
    const resultado = await trf1Service.consultarProcesso(secao, proc, uf);

    res.json(resultado);
  } catch (error) {
    res.status(500).json({
      sucesso: false,
      mensagem: `Erro durante a consulta: ${error.message}`,
    });
  }
});

/**
 * Consultar Processo (GET - alternativo)
 * GET /api/consultar?secao=TRF1&proc=10025962720234013311&uf=BA
 */
app.get("/api/consultar", async (req, res) => {
  try {
    const { secao, proc, uf } = req.query;

    // Validação
    if (!secao || !proc || !uf) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Parâmetros obrigatórios: secao, proc, uf",
      });
    }

    // Garantir que o serviço está inicializado
    if (!trf1Service.isReady()) {
      await trf1Service.initialize();
    }

    // Consultar
    const resultado = await trf1Service.consultarProcesso(secao, proc, uf);

    res.json(resultado);
  } catch (error) {
    res.status(500).json({
      sucesso: false,
      mensagem: `Erro durante a consulta: ${error.message}`,
    });
  }
});

/**
 * Fechar o Serviço
 * POST /api/fechar
 */
app.post("/api/fechar", async (req, res) => {
  try {
    await trf1Service.close();
    res.json({
      sucesso: true,
      mensagem: "Serviço fechado com sucesso",
    });
  } catch (error) {
    res.status(500).json({
      sucesso: false,
      mensagem: `Erro ao fechar: ${error.message}`,
    });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`[API] Servidor rodando em http://localhost:${PORT}`);
  console.log(`[API] Endpoints disponíveis:`);
  console.log(`  GET  /health - Health check`);
  console.log(`  GET  /api/status - Status do serviço`);
  console.log(`  POST /api/inicializar - Inicializar o serviço`);
  console.log(`  POST /api/consultar - Consultar processo (JSON)`);
  console.log(`  GET  /api/consultar?secao=TRF1&proc=...&uf=BA - Consultar processo (Query)`);
  console.log(`  POST /api/fechar - Fechar o serviço`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n[API] Encerrando servidor...");
  await trf1Service.close();
  process.exit(0);
});
