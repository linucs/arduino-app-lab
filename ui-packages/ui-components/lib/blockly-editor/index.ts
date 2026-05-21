import { lazy } from 'react';

// Blockly is ~600 KB gzipped — load it only when a user actually opens the
// Blocks tab (or auto-routes there because a sidecar exists).
export const LazyBlocklyEditor = lazy(() => import('./BlocklyEditor'));

export type { BlocklyEditorLogic, BlocklyLanguage } from './blocklyEditor.type';
export { SIDECAR_FORMAT_VERSION } from './blocklyEditor.type';
