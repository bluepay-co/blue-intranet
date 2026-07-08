import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { Role } from '../models/usuario.model';
import {
  postCriar, putEditar, getMeus, getTodos, getChamado,
  postComentario, patchStatus, getResumo, getDashboard,
} from '../controllers/backoffice.controller';

// Upload em memória (o buffer é repassado ao backoffice via POST /uploads).
const EXT_OK = /^(image\/(jpeg|png|gif|webp|svg\+xml)|application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|text\/plain|video\/(mp4|quicktime|x-msvideo|webm|x-matroska))$/;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (EXT_OK.test(file.mimetype)) return cb(null, true);
    cb(new Error('Tipo de arquivo não permitido.'));
  },
});

export const backofficeRouter = Router();

backofficeRouter.use(authMiddleware);

// ── Rotas literais antes das dinâmicas (/:id) ─────────────────────────────────
backofficeRouter.get('/resumo', getResumo);
backofficeRouter.get('/admin/todos', roleMiddleware(Role.TI, Role.DESENVOLVEDOR), getTodos);
backofficeRouter.get('/admin/dashboard', roleMiddleware(Role.TI, Role.DESENVOLVEDOR), getDashboard);

// ── Colaborador (dono) ────────────────────────────────────────────────────────
backofficeRouter.get('/', getMeus);
backofficeRouter.post('/', upload.single('anexo'), postCriar);
backofficeRouter.get('/:id', getChamado);
backofficeRouter.put('/:id', putEditar);
backofficeRouter.post('/:id/comentarios', postComentario);

// ── Exclusivo T.I. ────────────────────────────────────────────────────────────
backofficeRouter.patch('/:id/status', roleMiddleware(Role.TI, Role.DESENVOLVEDOR), patchStatus);
