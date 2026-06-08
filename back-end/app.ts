import path from 'path';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { router } from './routes/index';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(router);

export { app };