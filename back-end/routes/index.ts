import { Router } from 'express';

const router = Router();

// Example route
router.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello, World!' });
});

export { router };