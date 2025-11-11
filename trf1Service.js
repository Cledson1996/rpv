const puppeteer = require("puppeteer");

/**
 * Serviço persistente que mantém uma instância do Puppeteer aberta
 * para reutilização em múltiplas consultas.
 * Otimizado para Vercel (sem puppeteer-extra-plugin-stealth)
 */
class TRF1Service {
  constructor() {
    this.browser = null;
    this.page = null;
    this.isInitializing = false;
  }

  /**
   * Inicializa o navegador (apenas uma vez)
   */
  async initialize() {
    if (this.browser || this.isInitializing) {
      return;
    }

    this.isInitializing = true;

    try {
      console.log("[TRF1Service] Inicializando navegador Puppeteer...");

      // Detectar se está no Vercel
      const isVercel = process.env.VERCEL === "1";
      const executablePath = isVercel
        ? process.env.CHROMIUM_PATH || "/usr/bin/chromium"
        : undefined;

      this.browser = await puppeteer.launch({
        headless: true,
        executablePath: executablePath,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--disable-web-resources",
          "--disable-extensions",
          "--disable-plugins",
          "--disable-images",
          "--single-process", // Para Vercel
          "--no-first-run",
          "--no-default-browser-check",
        ],
      });

      this.page = await this.browser.newPage();

      // Configurar user-agent para parecer um navegador real
      await this.page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      );

      // Configurar viewport
      await this.page.setViewport({ width: 1920, height: 1080 });

      // Bloquear recursos desnecessários para acelerar
      await this.page.setRequestInterception(true);
      this.page.on("request", (request) => {
        const resourceType = request.resourceType();
        if (["image", "stylesheet", "font", "media"].includes(resourceType)) {
          request.abort();
        } else {
          request.continue();
        }
      });

      console.log("[TRF1Service] Navegador inicializado com sucesso!");
    } catch (error) {
      console.error("[TRF1Service] Erro ao inicializar navegador:", error);
      this.browser = null;
      this.page = null;
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Consulta um processo do TRF1 e extrai informações de RPV
   */
  async consultarProcesso(secao, proc, uf) {
    try {
      // Garantir que o navegador está inicializado
      if (!this.browser || !this.page) {
        await this.initialize();
      }

      if (!this.page) {
        throw new Error("Falha ao inicializar a página");
      }

      const url = `https://processual.trf1.jus.br/consultaProcessual/processoExecucao/listar.php?secao=${secao}&proc=${proc}&uf=${uf}`;

      console.log(`[TRF1Service] Consultando: ${url}`);

      // Navegar para a URL
      await this.page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });

      console.log("[TRF1Service] Página carregada com sucesso");

      // Aguardar o reCAPTCHA ser resolvido e o conteúdo principal aparecer
      try {
        await this.page.waitForSelector("a.listar-processo", {
          timeout: 30000,
        });
        console.log("[TRF1Service] Conteúdo principal carregado");
      } catch {
        console.log(
          "[TRF1Service] Seletor esperado não encontrado, continuando..."
        );
      }

      // Extrair o HTML da página
      const html = await this.page.content();

      // Procurar por palavras-chave de RPV no HTML
      const palavrasChaveRPV = [
        "Requisição de Pequeno Valor",
        "RPV",
        "migração",
        "migrado",
        "precatório",
        "requisitorio",
      ];

      let temRPV = false;
      let detalhesRPV = "";

      for (const palavra of palavrasChaveRPV) {
        if (html.toLowerCase().includes(palavra.toLowerCase())) {
          temRPV = true;
          detalhesRPV = palavra;
          break;
        }
      }

      return {
        sucesso: true,
        mensagem: temRPV
          ? `RPV encontrada: ${detalhesRPV}`
          : "Página carregada, mas RPV não foi encontrada",
        temRPV,
        detalhes: detalhesRPV,
      };
    } catch (error) {
      console.error("[TRF1Service] Erro durante a consulta:", error);
      return {
        sucesso: false,
        mensagem: `Erro durante a consulta: ${error.message}`,
      };
    }
  }

  /**
   * Fecha o navegador (limpeza)
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      console.log("[TRF1Service] Navegador fechado");
    }
  }

  /**
   * Verifica se o serviço está pronto
   */
  isReady() {
    return this.browser !== null && this.page !== null;
  }
}

// Exportar instância única (singleton)
module.exports = new TRF1Service();
