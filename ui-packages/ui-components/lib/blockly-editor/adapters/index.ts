import { BlocklyLanguage, Runtime } from '../blocklyEditor.type';
import { arduinoCppAdapter } from './arduinoCppAdapter';
import { arduinoPythonAdapter } from './arduinoPythonAdapter';
import { RuntimeAdapter } from './runtimeAdapter.type';

export { arduinoCppAdapter } from './arduinoCppAdapter';
export { arduinoPythonAdapter } from './arduinoPythonAdapter';
export type { RuntimeAdapter } from './runtimeAdapter.type';

export const adapterFor = (runtime: Runtime): RuntimeAdapter =>
  runtime === 'arduino:python' ? arduinoPythonAdapter : arduinoCppAdapter;

// Bridges the editor-facing `BlocklyLanguage` (also the sidecar envelope's
// on-disk `language` field) to the catalog-facing `Runtime` used by adapters.
// Keeps the sidecar format unchanged while letting the adapter layer line up
// with iteration 4's catalog keys.
export const languageToRuntime = (language: BlocklyLanguage): Runtime =>
  language === 'python' ? 'arduino:python' : 'arduino:cpp';
