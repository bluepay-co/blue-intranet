import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { Role } from '../models/usuario.model';
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

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) return cb(null, true);
    cb(new Error('Apenas imagens são permitidas.'));
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
