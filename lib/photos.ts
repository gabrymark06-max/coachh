// Progress photos: resized and compressed, cached in this browser (IndexedDB) and, when logged in,
// stored in the private Supabase bucket so they follow the account to every device.
import { supabase, currentUserId } from './supabase';

const DB = 'tempra-photos', STORE = 'photos', BUCKET = 'photos';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => { db.close(); resolve(req.result); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/** Resize to at most 1280 px on the long side and encode as JPEG. */
async function compress(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(Error('Foto non leggibile.'))), 'image/jpeg', 0.82));
}

const path = (userId: string, key: string) => `${userId}/${key}.jpg`;

export async function savePhoto(file: File): Promise<string> {
  const key = crypto.randomUUID();
  const blob = await compress(file);
  try { await run('readwrite', s => s.put(blob, key)); } catch { /* no local cache: the cloud copy is enough */ }
  const uid = await currentUserId();
  if (supabase && uid) {
    const { error } = await supabase.storage.from(BUCKET).upload(path(uid, key), blob, { contentType: 'image/jpeg', upsert: true });
    if (error) throw Error('Caricamento della foto non riuscito: ' + error.message);
  }
  return key;
}

export async function photoUrl(key: string): Promise<string | null> {
  try { const blob = await run<Blob | undefined>('readonly', s => s.get(key) as IDBRequest<Blob | undefined>); if (blob) return URL.createObjectURL(blob); } catch { /* fall back to the cloud */ }
  const uid = await currentUserId();
  if (!supabase || !uid) return null;
  const { data } = await supabase.storage.from(BUCKET).download(path(uid, key));
  if (!data) return null;
  try { await run('readwrite', s => s.put(data, key)); } catch { /* cache is optional */ }
  return URL.createObjectURL(data);
}

export async function deletePhotos(keys: string[]) {
  try { const db = await open(); const tx = db.transaction(STORE, 'readwrite'); for (const k of keys) tx.objectStore(STORE).delete(k); await new Promise(r => { tx.oncomplete = r; tx.onerror = r; }); db.close(); } catch { /* nothing cached */ }
  const uid = await currentUserId();
  if (supabase && uid && keys.length) await supabase.storage.from(BUCKET).remove(keys.map(k => path(uid, k)));
}

/** Clear the local cache only (logout, reset): cloud copies are removed separately. */
export async function clearPhotos() {
  try { await run('readwrite', s => s.clear()); } catch { /* storage unavailable */ }
}
