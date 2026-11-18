import * as angkat from './angkat.js';
import * as derek from './derek.js';
import * as lift from './lift.js';
import * as sabuk from './sabuk.js';
import * as sepeda from './sepeda.js';
import { fmt } from '../format.js';

/**
 * Each scene module exports:
 *   render(p, r, s, f) → SVG string (600 × 380 viewBox)
 *   camera = { desktop, portrait } viewBox strings
 *   handle(key, p, portrait) → { x, y, axis, factor } drag handle for an interactive parameter
 */
export const sceneModules = { angkat, derek, lift, sabuk, sepeda };

/** Render a module scene for parameters p, result r and sampled state s. */
export function scene(id, p, r, s) {
  return sceneModules[id].render(p, r, s, fmt);
}
