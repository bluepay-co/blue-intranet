import http from 'http';
import { Server } from 'socket.io';
import { app } from './app';
import { setIo } from './socket/io-instance';
import { registrarChatSocket } from './socket/chat.socket';

const PORT = process.env.PORT || 3000;

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  },
});

setIo(io);
registrarChatSocket(io);

httpServer.listen(PORT, () => {
  console.log(`Servidor está iniciando na porta ${PORT}`);
});
