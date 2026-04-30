import { getUser, listUsers, putUser } from './db';
import { uid } from './files';

const ITERATIONS = 200_000;
const SALT_BYTES = 16;
const HASH_BITS = 256;

export interface UserRecord {
  id: string;
  email: string;
  emailLower: string;
  firstName: string;
  lastName: string;
  display: string;
  saltB64: string;
  hashB64: string;
  iterations: number;
  createdAt: number;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

function bufToB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function b64ToBuf(b64: string): ArrayBuffer {
  const s = atob(b64);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes.buffer;
}

async function deriveHash(
  password: string,
  salt: ArrayBuffer,
  iterations = ITERATIONS,
): Promise<ArrayBuffer> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    baseKey,
    HASH_BITS,
  );
}

function timingSafeEqual(a: ArrayBuffer, b: ArrayBuffer): boolean {
  if (a.byteLength !== b.byteLength) return false;
  const av = new Uint8Array(a);
  const bv = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < av.length; i++) diff |= av[i] ^ bv[i];
  return diff === 0;
}

export async function createUser(
  email: string,
  firstName: string,
  lastName: string,
  password: string,
): Promise<UserRecord> {
  const trimmedEmail = email.trim();
  const trimmedFirst = firstName.trim();
  const trimmedLast = lastName.trim();
  if (!trimmedEmail) throw new Error('Email is required');
  if (!isValidEmail(trimmedEmail)) throw new Error('Enter a valid email address');
  if (!trimmedFirst) throw new Error('First name is required');
  if (!trimmedLast) throw new Error('Last name is required');
  if (password.length < 6) throw new Error('Password must be at least 6 characters');
  const lowerEmail = trimmedEmail.toLowerCase();
  const all = (await listUsers<UserRecord>()) ?? [];
  if (all.some((u) => u.emailLower === lowerEmail)) {
    throw new Error('An account with that email already exists on this device');
  }
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await deriveHash(password, salt.buffer);
  const user: UserRecord = {
    id: uid('usr'),
    email: trimmedEmail,
    emailLower: lowerEmail,
    firstName: trimmedFirst,
    lastName: trimmedLast,
    display: `${trimmedFirst} ${trimmedLast}`,
    saltB64: bufToB64(salt.buffer),
    hashB64: bufToB64(hash),
    iterations: ITERATIONS,
    createdAt: Date.now(),
  };
  await putUser(user);
  return user;
}

export async function verifyUser(
  email: string,
  password: string,
): Promise<UserRecord | null> {
  const lower = email.trim().toLowerCase();
  const all = (await listUsers<UserRecord>()) ?? [];
  const match = all.find((u) => u.emailLower === lower);
  if (!match) return null;
  const salt = b64ToBuf(match.saltB64);
  const expected = b64ToBuf(match.hashB64);
  const got = await deriveHash(password, salt, match.iterations ?? ITERATIONS);
  if (!timingSafeEqual(expected, got)) return null;
  return match;
}

export async function getUserById(id: string): Promise<UserRecord | undefined> {
  return getUser<UserRecord>(id);
}
