// Progress photos live only in this browser (IndexedDB), resized and compressed; the measurements keep their keys.
const DB = 'tempra-photos', STORE = 'photos';

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

export async function savePhoto(file: File): Promise<string> {
  const key = crypto.randomUUID();
  const blob = await compress(file);
  try { await run('readwrite', s => s.put(blob, key)); } catch { throw Error('Spazio per le foto esaurito su questo dispositivo.'); }
  return key;
}

export async function photoUrl(key: string): Promise<string | null> {
  try { const blob = await run<Blob | undefined>('readonly', s => s.get(key) as IDBRequest<Blob | undefined>); return blob ? URL.createObjectURL(blob) : null; } catch { return null; }
}

export async function deletePhotos(keys: string[]) {
  try { const db = await open(); const tx = db.transaction(STORE, 'readwrite'); for (const k of keys) tx.objectStore(STORE).delete(k); await new Promise(r => { tx.oncomplete = r; tx.onerror = r; }); db.close(); } catch { /* nothing to delete */ }
}

export async function clearPhotos() {
  try { await run('readwrite', s => s.clear()); } catch { /* storage unavailable */ }
}
