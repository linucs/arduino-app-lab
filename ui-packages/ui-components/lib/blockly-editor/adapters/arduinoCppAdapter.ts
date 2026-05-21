import * as Blockly from 'blockly';

import { ArduinoCppGenerator } from '../generators/ArduinoCppGenerator';
import { cppToolbox } from '../toolboxes/cppToolbox';
import { RuntimeAdapter } from './runtimeAdapter.type';

export const arduinoCppAdapter: RuntimeAdapter = {
  runtime: 'arduino:cpp',
  generator: new ArduinoCppGenerator() as unknown as Blockly.CodeGenerator,
  toolbox: cppToolbox,
};
