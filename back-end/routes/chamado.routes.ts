import { Router } from 'express';
import type { Request } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { Role } from '../models/usuario.model';
import { AppError } from '../utils/app-error';
import { pool } from '../database/pool';
import { salaCargo, salaUsuario, sincronizarAposEscrita } from '../socket/sync';
import {
  postCriar,
  getMeus,
  getTodos,
  getChamadosProdutos,
  getResumo,
  getChamado,
  putEditar,
  patchStatus,
  postComentario,
  getDashboard,
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

// Whitelist explícita (sem `image/svg+xml`): SVG pode conter <script> embutido
// e o anexo é servido estaticamente em /uploads — aberto a XSS armazenado.
const IMAGEM_OK = /^image\/(jpeg|png|gif|webp)$/;
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (IMAGEM_OK.test(file.mimetype) || file.mimetype === 'application/pdf') {
      return cb(null, true);
    }
    cb(new AppError('Apenas imagens (JPEG/PNG/GIF/WebP) ou PDF são permitidos.', 400));
  },
});

const chamadosRouter = Router();

/**
 * Quem enxerga um chamado no resumo (polling de notificações): o autor e a
 * equipe de T.I. — espelha `resumoChamados`. Em rotas /:id busca o autor;
 * na abertura (POST /) o autor é quem abriu.
 */
async function publicoDoChamado(req: Request): Promise<string[]> {
  const salas = [salaCargo(Role.TI), salaCargo(Role.DESENVOLVEDOR)];
  const id = Number(req.params.id);
  if (Number.isInteger(id) && id > 0) {
    const { rows } = await pool.query<{ usuario_id: number }>('SELECT usuario_id FROM chamados WHERE id = $1', [id]);
    if (rows[0]) salas.push(salaUsuario(rows[0].usuario_id));
  } else if (req.usuario) {
    salas.push(salaUsuario(req.usuario.id));
  }
  return salas;
}

const avisarPublico = sincronizarAposEscrita('chamados', publicoDoChamado);

// Todas as rotas exigem autenticação.
chamadosRouter.use(authMiddleware);

// ── Rotas literais antes das dinâmicas (/:id) ─────────────────────────────────
chamadosRouter.get('/resumo', getResumo);
chamadosRouter.get('/admin/todos', roleMiddleware(Role.TI, Role.DESENVOLVEDOR), getTodos);
chamadosRouter.get('/admin/dashboard', roleMiddleware(Role.TI, Role.DESENVOLVEDOR), getDashboard);
chamadosRouter.get('/produtos/todos', roleMiddleware(Role.PRODUTOS, Role.DESENVOLVEDOR), getChamadosProdutos);

// ── Colaborador (dono) + acesso compartilhado com T.I. ────────────────────────
chamadosRouter.get('/', getMeus);
chamadosRouter.post('/', avisarPublico, upload.single('anexo'), postCriar);
chamadosRouter.get('/:id', getChamado);
chamadosRouter.put('/:id', avisarPublico, putEditar);
chamadosRouter.post('/:id/comentarios', avisarPublico, postComentario);

// ── Exclusivo T.I. ────────────────────────────────────────────────────────────
chamadosRouter.patch('/:id/status', roleMiddleware(Role.TI, Role.DESENVOLVEDOR), avisarPublico, patchStatus);

export { chamadosRouter };
