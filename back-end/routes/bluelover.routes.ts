import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { Role } from '../models/usuario.model';
import { AppError } from '../utils/app-error';
import {
  getVitrine,
  getPerfil,
  getAdminLista,
  getAdminPerfil,
  postCriarPerfil,
  putEditarPerfil,
  deletePerfil,
  patchPublicar,
  postCriarBloco,
  putEditarBloco,
  deleteBloco,
  patchOrdemBlocos,
} from '../controllers/bluelover.controller';

const uploadDir = path.join(__dirname, '..', 'uploads', 'bluelovers');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

// Whitelist explícita (sem `image/svg+xml`): SVG pode conter <script>/<foreignObject>
// embutido e é servido estaticamente em /uploads — permiti-lo abriria XSS
// armazenado para quem abre a imagem diretamente no navegador.
const IMAGEM_OK = /^image\/(jpeg|png|gif|webp)$/;
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (IMAGEM_OK.test(file.mimetype)) return cb(null, true);
    cb(new AppError('Apenas imagens JPEG, PNG, GIF ou WebP são permitidas.', 400));
  },
});

// O perfil tem dois campos de imagem fixos e nomeados: a capa 4:5 do card e a
// imagem grande do topo da página. As fotos das seções sobem uma a uma, pelos
// endpoints de bloco, mantendo o `upload.single` já usado no resto do projeto.
const uploadPerfil = upload.fields([
  { name: 'foto_capa', maxCount: 1 },
  { name: 'foto_destaque', maxCount: 1 },
]);

const blueloverRouter = Router();

// ── Painel do Marketing (exclusivo MARKETING) ────────────────────────────────
// Montado ANTES da rota pública `/:id`: fosse o contrário, `/admin` casaria com
// `:id` e toda chamada do painel morreria em "Identificador inválido".
const adminRouter = Router();
adminRouter.use(authMiddleware, roleMiddleware(Role.MARKETING, Role.DESENVOLVEDOR));

// Seções — declaradas antes das rotas com `:id` para que `blocos` não seja
// interpretado como identificador de perfil.
adminRouter.put('/blocos/:blocoId', upload.single('foto'), putEditarBloco);
adminRouter.delete('/blocos/:blocoId', deleteBloco);

adminRouter.get('/', getAdminLista);
adminRouter.post('/', uploadPerfil, postCriarPerfil);
adminRouter.get('/:id', getAdminPerfil);
adminRouter.put('/:id', uploadPerfil, putEditarPerfil);
adminRouter.delete('/:id', deletePerfil);
adminRouter.patch('/:id/publicar', patchPublicar);
adminRouter.post('/:id/blocos', upload.single('foto'), postCriarBloco);
adminRouter.patch('/:id/blocos/ordem', patchOrdemBlocos);

blueloverRouter.use('/admin', adminRouter);

// ── Vitrine pública (todos os usuários autenticados) ─────────────────────────
blueloverRouter.get('/', authMiddleware, getVitrine);
blueloverRouter.get('/:id', authMiddleware, getPerfil);

export { blueloverRouter };
