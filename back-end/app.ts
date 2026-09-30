import path from 'path';
import dotenv from 'dotenv';
import express from 'express';
import type { ErrorRequestHandler } from 'express';
import cors from 'cors';
import type { CorsOptions } from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import { router } from './routes/index';
import { apiRateLimit } from './middleware/api-rate-limit.middleware';
import { uploadsAuthMiddleware } from './middleware/uploads-auth.middleware';
import { AppError } from './utils/app-error';

dotenv.config();

const app = express();

app.set('trust proxy', 1);

const origensPermitidas = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const corsOptions: CorsOptions = {
  origin: origensPermitidas.length > 0 ? origensPermitidas : true,
  credentials: true,
};

app.use(helmet({
  // CSP do frontend fica no nginx; aqui só os headers relevantes para API.
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
}));
app.use(cors(corsOptions));
app.use('/api', apiRateLimit);
app.use(express.json());
app.use('/uploads', uploadsAuthMiddleware, express.static(path.join(__dirname, 'uploads')));
app.use(router);

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