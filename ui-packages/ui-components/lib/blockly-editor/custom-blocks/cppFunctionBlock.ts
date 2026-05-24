import * as Blockly from 'blockly';

import { PALETTE } from '../palette';
import { CPP_VARIABLE_TYPES } from '../blocklyPlugins';
import { createMinusFieldWithIndex, createPlusField } from './blocklyFieldHelpers';

// Return type options: void + all C++ types.
const RETURN_TYPES: [string, string][] = [
  ['void', 'void'],
  ...CPP_VARIABLE_TYPES,
];

// Parameter type options: all C++ types (no void).
const PARAM_TYPES: [string, string][] = CPP_VARIABLE_TYPES;

interface CppFunctionBlock extends Blockly.Block {
  paramCount_: number;
  plus(): void;
  minus(idx: number): void;
  addParam_(): void;
  removeParam_(idx: number): void;
}

// Block registration is guarded so HMR / StrictMode re-imports are safe.
if (!Blockly.Blocks['cpp_function_def']) {
  Blockly.Blocks['cpp_function_def'] = {

    init(this: CppFunctionBlock): void {
      // Instance-level counter — must be set here, not on the prototype.
      this.paramCount_ = 0;

      this.appendDummyInput('HEADER')
        .appendField(createPlusField())
        .appendField('C++ function')
        .appendField(new Blockly.FieldTextInput('myFunction'), 'NAME')
        .appendField('→')
        .appendField(new Blockly.FieldDropdown(RETURN_TYPES), 'RETURN_TYPE');

      this.appendStatementInput('STACK').setCheck(null);

      this.setColour(PALETTE.Functions);
      this.setTooltip(
        'Define a C++ function with typed parameters. ' +
        'Use [+] to add parameters and [−] to remove them.',
      );
      this.setPreviousStatement(false);
      this.setNextStatement(false);
    },

    // Called by createPlusField onClick → block.plus()
    plus(this: CppFunctionBlock): void {
      this.addParam_();
    },

    // Called by createMinusField onClick → block.minus(idx)
    minus(this: CppFunctionBlock, idx: number): void {
      this.removeParam_(idx);
    },

    addParam_(this: CppFunctionBlock): void {
      const idx = this.paramCount_++;
      this.appendDummyInput(`PARAM_${idx}`)
        .setAlign(Blockly.inputs.Align.RIGHT)
        .appendField(new Blockly.FieldDropdown(PARAM_TYPES), `TYPE_${idx}`)
        .appendField(new Blockly.FieldTextInput(`param${idx + 1}`), `NAME_${idx}`)
        .appendField(createMinusFieldWithIndex(idx));
      // Keep the body (STACK) always at the bottom.
      this.moveInputBefore('STACK', null);
    },

    removeParam_(this: CppFunctionBlock, idx: number): void {
      // Capture live field values for all params except the one being removed.
      const kept: Array<{ type: string; name: string }> = [];
      for (let i = 0; i < this.paramCount_; i++) {
        if (i === idx) continue;
        kept.push({
          type: this.getFieldValue(`TYPE_${i}`) ?? 'int',
          name: this.getFieldValue(`NAME_${i}`) ?? `param${i + 1}`,
        });
      }

      // Remove all existing PARAM_* inputs.
      for (let i = 0; i < this.paramCount_; i++) {
        this.removeInput(`PARAM_${i}`);
      }
      this.paramCount_ = 0;

      // Re-add surviving params with sequential indices.
      for (const p of kept) {
        const newIdx = this.paramCount_++;
        this.appendDummyInput(`PARAM_${newIdx}`)
          .setAlign(Blockly.inputs.Align.RIGHT)
          .appendField(new Blockly.FieldDropdown(PARAM_TYPES), `TYPE_${newIdx}`)
          .appendField(new Blockly.FieldTextInput(p.name), `NAME_${newIdx}`)
          .appendField(createMinusFieldWithIndex(newIdx));
        this.setFieldValue(p.type, `TYPE_${newIdx}`);
      }

      this.moveInputBefore('STACK', null);
    },

    // --- Serialization (modern Blockly JSON state) ---

    saveExtraState(this: CppFunctionBlock): object {
      const params: Array<{ type: string; name: string }> = [];
      for (let i = 0; i < this.paramCount_; i++) {
        params.push({
          type: this.getFieldValue(`TYPE_${i}`) ?? 'int',
          name: this.getFieldValue(`NAME_${i}`) ?? `param${i + 1}`,
        });
      }
      return { params };
    },

    loadExtraState(
      this: CppFunctionBlock,
      state: { params: Array<{ type: string; name: string }> },
    ): void {
      // Remove any params that may exist (e.g. from a previous loadExtraState).
      for (let i = 0; i < this.paramCount_; i++) {
        this.removeInput(`PARAM_${i}`);
      }
      this.paramCount_ = 0;

      for (const p of state.params ?? []) {
        const idx = this.paramCount_++;
        this.appendDummyInput(`PARAM_${idx}`)
          .setAlign(Blockly.inputs.Align.RIGHT)
          .appendField(new Blockly.FieldDropdown(PARAM_TYPES), `TYPE_${idx}`)
          .appendField(new Blockly.FieldTextInput(p.name), `NAME_${idx}`)
          .appendField(createMinusFieldWithIndex(idx));
        this.setFieldValue(p.type, `TYPE_${idx}`);
      }

      this.moveInputBefore('STACK', null);
    },
  };
}
