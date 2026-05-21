import * as Blockly from 'blockly';

import { Runtime } from '../blocklyEditor.type';

export interface RuntimeAdapter {
  readonly runtime: Runtime;
  readonly generator: Blockly.CodeGenerator;
  readonly toolbox: Blockly.utils.toolbox.ToolboxDefinition;
}
