import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  getCanais,
  getNaoLidos,
  postCanalCustomizado,
  getOrCreatePrivado,
  getMensagens,
  postMensagem,
  patchMensagem,
  deleteMensagem,
  patchLeitura,
  getBuscarUsuarios,
} from '../controllers/chat.controller';

const uploadDir = path.join(__dirname, '..', 'uploads', 'chat');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const MIME_PERMITIDOS = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]);

// Whitelist explícita (sem `image/svg+xml`): SVG pode conter <script> embutido
// e o anexo é servido estaticamente em /uploads — aberto a XSS armazenado.
const IMAGEM_OK = /^image\/(jpeg|png|gif|webp)$/;
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (IMAGEM_OK.test(file.mimetype) || MIME_PERMITIDOS.has(file.mimetype)) {
      return cb(null, true);
    }
    cb(new Error('Apenas imagens (JPEG/PNG/GIF/WebP), PDF ou planilhas são permitidos.'));
  },
});

const chatRouter = Router();

chatRouter.use(authMiddleware);

// ── Canais ────────────────────────────────────────────────────────────────────
chatRouter.get('/canais', getCanais);
chatRouter.post('/canais', postCanalCustomizado);
chatRouter.post('/canais/privado', getOrCreatePrivado);

// ── Mensagens ─────────────────────────────────────────────────────────────────
chatRouter.get('/canais/:id/mensagens', getMensagens);
chatRouter.post('/canais/:id/mensagens', upload.single('anexo'), postMensagem);
chatRouter.patch('/canais/:id/leitura', patchLeitura);

chatRouter.patch('/mensagens/:id', patchMensagem);
chatRouter.delete('/mensagens/:id', deleteMensagem);

// ── Utilitários ───────────────────────────────────────────────────────────────
chatRouter.get('/nao-lidos', getNaoLidos);
chatRouter.get('/usuarios', getBuscarUsuarios);

export { chatRouter };
