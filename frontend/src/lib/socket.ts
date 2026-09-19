"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { API_URL } from "./api";

let shared: Socket | null = null;

export function getSocket() {
  if (typeof window === "undefined") return null;
  if (!shared) {
    shared = io(API_URL, { withCredentials: true, autoConnect: true });
  }
  return shared;
}

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  useEffect(() => {
    const s = getSocket();
    setSocket(s);
  }, []);
  return socket;
}
