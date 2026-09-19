import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";

let io: Server | null = null;

export function initSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      credentials: true,
    },
  });

  io.on("connection", (socket: Socket) => {
    socket.on("auction:join", (auctionId: string) => {
      socket.join(`auction:${auctionId}`);
    });
    socket.on("auction:leave", (auctionId: string) => {
      socket.leave(`auction:${auctionId}`);
    });
    socket.on("user:join", (userId: string) => {
      socket.join(`user:${userId}`);
    });
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
}

export function emitBidUpdate(auctionId: string, payload: unknown) {
  getIO().to(`auction:${auctionId}`).emit("bid:new", payload);
}

export function emitAuctionEnded(auctionId: string, payload: unknown) {
  getIO().to(`auction:${auctionId}`).emit("auction:ended", payload);
}

export function emitNotification(userId: string, payload: unknown) {
  getIO().to(`user:${userId}`).emit("notification:new", payload);
}
