import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { Role } from '../models/usuario.model';
import {
  postCriar,
  getMeus,
  getTodos,
  getResumo,
  getChamado,
  putEditar,
  patchStatus,
  postComentario,
} from '../controllers/chamado.controller';

const uploadDir = path.join(__dirname, '..', 'uploads', 'chamados');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      return cb(null, true);
    }
    cb(new Error('Apenas imagens ou PDF são permitidos.'));
  },
});

const chamadosRouter = Router();

// Todas as rotas exigem autenticação.
chamadosRouter.use(authMiddleware);

// ── Rotas literais antes das dinâmicas (/:id) ─────────────────────────────────
chamadosRouter.get('/resumo', getResumo);
chamadosRouter.get('/admin/todos', roleMiddleware(Role.TI, Role.DESENVOLVEDOR), getTodos);

// ── Colaborador (dono) + acesso compartilhado com T.I. ────────────────────────
chamadosRouter.get('/', getMeus);
chamadosRouter.post('/', upload.single('anexo'), postCriar);
chamadosRouter.get('/:id', getChamado);
chamadosRouter.put('/:id', putEditar);
chamadosRouter.post('/:id/comentarios', postComentario);

// ── Exclusivo T.I. ────────────────────────────────────────────────────────────
chamadosRouter.patch('/:id/status', roleMiddleware(Role.TI, Role.DESENVOLVEDOR), patchStatus);

export { chamadosRouter };
