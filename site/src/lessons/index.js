import angkat from './angkat.js';
import derek from './derek.js';
import lift from './lift.js';
import sabuk from './sabuk.js';
import sepeda from './sepeda.js';

export const lessons = [angkat, derek, lift, sabuk, sepeda];
export const byId = (id) => lessons.find((l) => l.id === id);
