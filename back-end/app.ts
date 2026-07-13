import path from 'path';
import dotenv from 'dotenv';
import express from 'express';
import type { ErrorRequestHandler } from 'express';
import cors from 'cors';
import multer from 'multer';
import { router } from './routes/index';
import { AppError } from './utils/app-error';

dotenv.config();

const app = express();

app.use(cors());
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