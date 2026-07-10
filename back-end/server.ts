import http from 'http';
import { Server } from 'socket.io';
import { app } from './app';
import { registrarChatSocket } from './socket/chat.socket';
import { setIo } from './socket/io-instance';

const PORT = process.env.PORT || 3000;

const httpServer = http.createServer(app);

// Socket.IO — chat em tempo real. `origin: true` reflete a origem da requisição,
// mantendo o mesmo comportamento aberto do CORS do Express (app.ts).
const io = new Server(httpServer, {
  cors: { origin: true, credentials: true },
});

setIo(io);
registrarChatSocket(io);

httpServer.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Servidor está iniciando na porta ${PORT}`);
});
