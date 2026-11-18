// Local progress, stored per browser. Every access is guarded: storage may be
// unavailable (private mode, blocked site data), and the app must still work.
const KEY = 'ruangfisika:v1';

let memory = {};
export let storageAvailable = true;

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    memory = raw ? JSON.parse(raw) : {};
    if (typeof memory !== 'object' || memory === null) memory = {};
  } catch {
    storageAvailable = false;
    memory = {};
  }
  return memory;
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(memory));
    storageAvailable = true;
  } catch {
    storageAvailable = false;
  }
  return storageAvailable;
}

/** Mutable draft object for one module. Call save() after changing it. */
export function draft(id) {
  memory[id] ??= {};
  return memory[id];
}

export function all() {
  return memory;
}

export function clearAll() {
  memory = {};
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
