// src/realtime/notificationSse.ts
import type { Response } from "express";

type Client = {
  res: Response;
};

const clientsByUser = new Map<number, Set<Client>>();

export function addClient(userId: number, res: Response) {
  const set = clientsByUser.get(userId) ?? new Set<Client>();
  set.add({ res });
  clientsByUser.set(userId, set);
}

export function removeClient(userId: number, res: Response) {
  const set = clientsByUser.get(userId);
  if (!set) return;

  for (const client of set) {
    if (client.res === res) set.delete(client);
  }
  if (set.size === 0) clientsByUser.delete(userId);
}

export function emitToUser(userId: number, event: string, data: unknown) {
  const set = clientsByUser.get(userId);
  if (!set || set.size === 0) return;

  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of set) {
    client.res.write(payload);
  }
}
