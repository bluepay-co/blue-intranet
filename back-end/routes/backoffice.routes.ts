import { Router } from 'express';
import type { Request } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleBloqueadoMiddleware, roleMiddleware } from '../middleware/role.middleware';
import {
  backofficeRateLimit, backofficeEscritaRateLimit,
} from '../middleware/backoffice-rate-limit.middleware';
import { pool } from '../database/pool';
import { salaCargo, salaUsuario, sincronizarAposEscrita } from '../socket/sync';
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

/**
 * Público do aviso: o dono do chamado + T.I./DEV, nunca todo mundo. Espelha o
 * `publicoDoChamado` de chamado.routes.ts, mas o dono vem de chamado_backoffice
 * (no backoffice o requester é sempre a conta do token).
 */
async function publicoDoChamado(req: Request): Promise<string[]> {
  const salas = [salaCargo(Role.TI), salaCargo(Role.DESENVOLVEDOR)];
  const id = Number(req.params.id);
  if (Number.isInteger(id) && id > 0) {
    const { rows } = await pool.query<{ usuario_id: number }>(
      'SELECT usuario_id FROM chamado_backoffice WHERE ticket_id = $1', [id],
    );
    if (rows[0]) salas.push(salaUsuario(rows[0].usuario_id));
  } else if (req.usuario) {
    salas.push(salaUsuario(req.usuario.id));
  }
  return salas;
}

const avisarPublico = sincronizarAposEscrita('chamados', publicoDoChamado);

// Rate limit depois do authMiddleware: a chave é o usuário, não o IP.
backofficeRouter.use(authMiddleware, backofficeRateLimit, backofficeEscritaRateLimit);

// ── Rotas literais antes das dinâmicas (/:id) ─────────────────────────────────
backofficeRouter.get('/resumo', getResumo);
backofficeRouter.get('/admin/todos', roleMiddleware(Role.TI, Role.DESENVOLVEDOR), getTodos);
backofficeRouter.get('/admin/dashboard', roleMiddleware(Role.TI, Role.DESENVOLVEDOR), getDashboard);

// ── Colaborador (dono) ────────────────────────────────────────────────────────
backofficeRouter.get('/', getMeus);
// T.I./DEV atendem os chamados, não abrem: quem resolve não é solicitante.
backofficeRouter.post(
  '/',
  roleBloqueadoMiddleware(Role.TI, Role.DESENVOLVEDOR),
  avisarPublico,
  upload.single('anexo'),
  postCriar,
);
backofficeRouter.get('/:id', getChamado);
backofficeRouter.put('/:id', avisarPublico, putEditar);
backofficeRouter.post('/:id/comentarios', avisarPublico, postComentario);

// ── Exclusivo T.I. ────────────────────────────────────────────────────────────
backofficeRouter.patch('/:id/status', roleMiddleware(Role.TI, Role.DESENVOLVEDOR), avisarPublico, patchStatus);
