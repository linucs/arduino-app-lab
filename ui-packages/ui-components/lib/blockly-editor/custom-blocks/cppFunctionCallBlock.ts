import * as Blockly from 'blockly';

import { PALETTE } from '../palette';
import { createMinusField, createPlusField } from './blocklyFieldHelpers';

interface CppFunctionCallBlock extends Blockly.Block {
  argCount_: number;
  plus(): void;
  minus(_idx: number): void;
  addArg_(): void;
  removeArg_(): void;
  updateMinus_(): void;
}

// Dynamic dropdown that reads cpp_function_def names from the live workspace.
// '__none__' is always the first option so it is never "unavailable" — Blockly
// warns when doValueUpdate_ is called with a value not in the current options,
// and that would happen on sidecar reload if __none__ were omitted whenever
// real functions exist.
function makeFuncNameField(): Blockly.FieldDropdown {
  return new Blockly.FieldDropdown(
    function (this: Blockly.FieldDropdown): [string, string][] {
      const block = this.getSourceBlock();
      const opts: [string, string][] = [['(select function…)', '__none__']];
      if (!block) return opts;
      const seen = new Set<string>();
      for (const b of block.workspace.getBlocksByType('cpp_function_def', false)) {
        const name = b.getFieldValue('NAME') || 'myFunction';
        if (!seen.has(name)) {
          seen.add(name);
          opts.push([name, name]);
        }
      }
      return opts;
    },
  );
}

// Shared block definition factory for statement and expression call variants.
function registerCallBlock(
  blockType: string,
  hasOutput: boolean,
): void {
  if (Blockly.Blocks[blockType]) return;

  Blockly.Blocks[blockType] = {
    init(this: CppFunctionCallBlock): void {
      this.argCount_ = 0;

      this.appendDummyInput('HEADER')
        .appendField(createPlusField())
        .appendField('call')
        .appendField(makeFuncNameField(), 'FUNC_NAME');

      if (hasOutput) {
        this.setOutput(true, null);
      } else {
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
      }
      this.setColour(PALETTE.Functions);
      this.setTooltip(
        hasOutput
          ? 'Call a C++ function and use its return value as an expression.'
          : 'Call a C++ function as a statement.',
      );
    },

    plus(this: CppFunctionCallBlock): void {
      this.addArg_();
      this.updateMinus_();
    },

    // idx is ignored — minus always removes the last argument.
    minus(this: CppFunctionCallBlock, _idx: number): void {
      if (this.argCount_ === 0) return;
      this.removeArg_();
      this.updateMinus_();
    },

    addArg_(this: CppFunctionCallBlock): void {
      const idx = this.argCount_++;
      this.appendValueInput(`ARG_${idx}`)
        .setAlign(Blockly.inputs.Align.RIGHT)
        .appendField(`arg ${idx + 1}`);
    },

    removeArg_(this: CppFunctionCallBlock): void {
      this.argCount_--;
      this.removeInput(`ARG_${this.argCount_}`);
    },

    updateMinus_(this: CppFunctionCallBlock): void {
      const header = this.getInput('HEADER')!;
      const hasMinus = Boolean(this.getField('MINUS'));
      if (!hasMinus && this.argCount_ > 0) {
        // Insert [−] at position 1 (between [+] and 'call').
        header.insertFieldAt(1, createMinusField(), 'MINUS');
      } else if (hasMinus && this.argCount_ === 0) {
        (header as unknown as { removeField(n: string): void }).removeField('MINUS');
      }
    },

    saveExtraState(this: CppFunctionCallBlock): object {
      return { argCount: this.argCount_ };
    },

    loadExtraState(
      this: CppFunctionCallBlock,
      state: { argCount: number },
    ): void {
      for (let i = 0; i < this.argCount_; i++) {
        this.removeInput(`ARG_${i}`);
      }
      this.argCount_ = 0;
      if (this.getField('MINUS')) {
        const header = this.getInput('HEADER')!;
        (header as unknown as { removeField(n: string): void }).removeField('MINUS');
      }
      for (let i = 0; i < (state.argCount ?? 0); i++) {
        this.addArg_();
      }
      if (this.argCount_ > 0) this.updateMinus_();
    },
  };
}

registerCallBlock('cpp_function_call', false);
registerCallBlock('cpp_function_call_expr', true);

// Simple return block — replaces procedures_ifreturn.
// VALUE input is optional: if connected → `return value;`, else → `return;`
if (!Blockly.Blocks['cpp_return']) {
  Blockly.Blocks['cpp_return'] = {
    init(this: Blockly.Block): void {
      this.appendValueInput('VALUE').appendField('return');
      this.setPreviousStatement(true, null);
      this.setNextStatement(false);
      this.setColour(PALETTE.Functions);
      this.setTooltip(
        'Return from the current C++ function. ' +
        'Connect a value block to return that value, or leave empty for void functions.',
      );
    },
  };
}
