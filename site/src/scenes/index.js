import { render as angkat } from './angkat.js';
import { render as derek } from './derek.js';
import { render as lift } from './lift.js';
import { render as sabuk } from './sabuk.js';
import { render as sepeda } from './sepeda.js';
import { fmt } from '../format.js';

const renderers = { angkat, derek, lift, sabuk, sepeda };

/** Render a module scene for parameters p, result r and sampled state s. */
export function scene(id, p, r, s) {
  return renderers[id](p, r, s, fmt);
}
