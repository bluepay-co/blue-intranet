import { Router } from 'express';
import { authRouter } from './auth.routes';

const router = Router();

// Example route
router.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello, World!' });
});

// Domínio: Autenticação (Google Workspace + JWT)
router.use('/api/auth', authRouter);

export { router };