/**
 * An index entry is "located" if a content claim has specified it's location
 * i.e. it is of type `LocatedIndexEntry`.
 *
 * @param {import('./api.js').IndexEntry} entry
 * @returns {entry is import('./api.js').LocatedIndexEntry}
 */
export const isLocated = entry => 'site' in entry
