/**
 * Lightweight localStorage-based offline write queue.
 * Mutations (progress saves, known-card marks) are queued when offline
 * and flushed when the browser comes back online.
 */
import { apiFetch } from './api.js';
import { v4 as uuidv4 } from 'uuid';

const QUEUE_KEY = 'kg_offline_queue';

interface QueuedRequest {
  id: string;
  path: string;
  method: string;
  body: unknown;
  enqueuedAt: number;
}

function loadQueue(): QueuedRequest[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') as QueuedRequest[];
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedRequest[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function enqueue(path: string, method: string, body: unknown): string {
  const id = uuidv4();
  const queue = loadQueue();
  queue.push({ id, path, method, body, enqueuedAt: Date.now() });
  saveQueue(queue);
  return id;
}

export function queueSize(): number {
  return loadQueue().length;
}

export async function flushQueue(): Promise<void> {
  const queue = loadQueue();
  if (queue.length === 0) return;

  const remaining: QueuedRequest[] = [];

  for (const item of queue) {
    try {
      await apiFetch(item.path, {
        method: item.method,
        auth: true,
        headers: { 'Idempotency-Key': item.id },
        body: JSON.stringify(item.body),
      });
    } catch {
      remaining.push(item);
    }
  }

  saveQueue(remaining);
}

// Auto-flush when coming back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    flushQueue().catch(() => undefined);
  });
}
