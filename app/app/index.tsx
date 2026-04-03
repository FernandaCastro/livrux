// The home tab inside the (app) group re-exports the root home screen.
// Expo Router resolves "/" to app/index.tsx at the root level, so this file
// redirects to keep the tab structure clean.
export { default } from '../index';
