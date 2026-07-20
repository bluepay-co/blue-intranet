import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { Role } from '../models/usuario.model';
import { AppError } from '../utils/app-error';
import {
  getFeed,
  getAdminPosts,
  postCriarPost,
  putEditarPost,
  deletePost,
  patchTogglePublicar,
  postReagir,
} from '../controllers/blog.controller';

const uploadDir = path.join(__dirname, '..', 'uploads', 'blog');
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

const blogRouter = Router();

// ── Feed público (todos os usuários autenticados) ─────────────────────────────
blogRouter.get('/', authMiddleware, getFeed);
blogRouter.post('/:postId/reagir', authMiddleware, postReagir);

// ── Painel admin (exclusivo MARKETING) ────────────────────────────────────────
const adminRouter = Router();
adminRouter.use(authMiddleware, roleMiddleware(Role.MARKETING, Role.DESENVOLVEDOR));

adminRouter.get('/posts', getAdminPosts);
adminRouter.post('/posts', upload.single('imagem'), postCriarPost);
adminRouter.put('/posts/:id', upload.single('imagem'), putEditarPost);
adminRouter.delete('/posts/:id', deletePost);
adminRouter.patch('/posts/:id/publicar', patchTogglePublicar);

blogRouter.use('/admin', adminRouter);

export { blogRouter };
