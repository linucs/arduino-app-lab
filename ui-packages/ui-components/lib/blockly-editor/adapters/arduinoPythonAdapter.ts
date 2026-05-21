import * as Blockly from 'blockly';

import { ArduinoPythonGenerator } from '../generators/ArduinoPythonGenerator';
import { pythonToolbox } from '../toolboxes/pythonToolbox';
import { RuntimeAdapter } from './runtimeAdapter.type';

// Double cast: CodeGenerator.forBlock uses the `this` polymorphic type, so
// subclass and base types are non-overlapping under strictFunctionTypes — a
// direct `as` is rejected. Runtime is safe; consumers only call base methods.
export const arduinoPythonAdapter: RuntimeAdapter = {
  runtime: 'arduino:python',
  generator: new ArduinoPythonGenerator() as unknown as Blockly.CodeGenerator,
  toolbox: pythonToolbox,
};
