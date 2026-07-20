import path from 'path';
import dotenv from 'dotenv';
import express from 'express';
import type { ErrorRequestHandler } from 'express';
import cors from 'cors';
import type { CorsOptions } from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { router } from './routes/index';
import { AppError } from './utils/app-error';

dotenv.config();

const app = express();

/**
 * CORS: por padrão reflete a origem da requisição (mesmo comportamento de
 * sempre), preservando o front-end atual e futuros domínios (ex.: Vercel).
 * Definir CORS_ORIGINS (lista separada por vírgula) no .env restringe a
 * apenas essas origens — recomendado antes de expor o back-end publicamente.
 */
const origensPermitidas = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const corsOptions: CorsOptions = {
  origin: origensPermitidas.length > 0 ? origensPermitidas : true,
};

app.use(helmet({
  // API pura (JSON + uploads estáticos) consumida por um front-end em outra
  // origem — o CSP/COEP padrão do helmet é para páginas HTML e quebraria o
  // carregamento cross-origin de imagens de /uploads. Mantemos só os
  // cabeçalhos de proteção relevantes para uma API.
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
}));
app.use(cors(corsOptions));

// Rede de segurança contra flood/DoS — bem generoso porque a empresa acessa
// via VPN (muitos usuários podem compartilhar o mesmo IP de saída).
// Limites finos por endpoint (ex.: prospecção, login) continuam à parte.
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Muitas requisições. Tente novamente em alguns minutos.' },
}));

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(router);

/**
 * Handler global de erro. Garante que erros lançados fora do try/catch dos
 * controllers (ex.: falhas do multer no middleware de upload) sempre retornem
 * JSON — e não o 500 em HTML padrão do Express, que o front não consegue ler.
 */
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE'
      ? 'A imagem excede o tamanho máximo permitido.'
      : 'Falha no upload do arquivo.';
    return res.status(400).json({ message: msg });
  }
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message });
  }
  console.error('[app] erro não tratado:', err);
  return res.status(500).json({ message: 'Erro interno no servidor.' });
};
app.use(errorHandler);

export { app };