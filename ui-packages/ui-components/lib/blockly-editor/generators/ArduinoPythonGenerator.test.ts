import * as Blockly from 'blockly';
import { describe, expect, it } from 'vitest';

import { ArduinoPythonGenerator } from './ArduinoPythonGenerator';

function makeWorkspace() {
  return new Blockly.Workspace();
}

// Creates a variable AND a variables_set block that references it so that
// Blockly.Variables.allUsedVarModels() picks it up during generator.init().
function addUsedVar(ws: Blockly.Workspace, name: string, type = '') {
  const model = ws.getVariableMap().createVariable(name, type);
  const block = ws.newBlock('variables_set');
  block.getField('VAR')!.setValue(model.getId());
  return model;
}

describe('ArduinoPythonGenerator', () => {
  describe('finish() — _State class', () => {
    it('emits class _State with all workspace variables', () => {
      const ws = makeWorkspace();
      addUsedVar(ws, 'counter');
      addUsedVar(ws, 'flag');
      const gen = new ArduinoPythonGenerator();
      gen.init(ws);
      const out = gen.finish('');
      expect(out).toContain('class _State:');
      expect(out).toContain('  counter = None');
      expect(out).toContain('  flag = None');
      ws.dispose();
    });

    it('omits class _State when no variables are declared', () => {
      const ws = makeWorkspace();
      const gen = new ArduinoPythonGenerator();
      gen.init(ws);
      const out = gen.finish('');
      expect(out).not.toContain('_State');
      ws.dispose();
    });

    it('_State appears before def loop()', () => {
      const ws = makeWorkspace();
      addUsedVar(ws, 'x');
      const gen = new ArduinoPythonGenerator();
      gen.init(ws);
      const out = gen.finish('');
      expect(out.indexOf('class _State')).toBeLessThan(out.indexOf('def loop()'));
      ws.dispose();
    });
  });

  describe('variables_get / variables_set handlers', () => {
    it('prefixes workspace variables with _State.', () => {
      const ws = makeWorkspace();
      const varModel = addUsedVar(ws, 'counter');
      const gen = new ArduinoPythonGenerator();
      gen.init(ws);

      const getBlock = ws.newBlock('variables_get');
      getBlock.getField('VAR')!.setValue(varModel.getId());
      const [code] = gen.forBlock['variables_get'](getBlock, gen) as [string, number];
      expect(code).toBe('_State.counter');
      ws.dispose();
    });

    it('generates _State assignment for variables_set', () => {
      const ws = makeWorkspace();
      const varModel = addUsedVar(ws, 'counter');
      const gen = new ArduinoPythonGenerator();
      gen.init(ws);

      const setBlock = ws.newBlock('variables_set');
      setBlock.getField('VAR')!.setValue(varModel.getId());
      const code = gen.forBlock['variables_set'](setBlock, gen) as string;
      expect(code).toBe('_State.counter = None\n');
      ws.dispose();
    });
  });

  describe('math_change handler', () => {
    it('prefixes both sides with _State. for workspace variables', () => {
      const ws = makeWorkspace();
      const varModel = addUsedVar(ws, 'led_status');
      const gen = new ArduinoPythonGenerator();
      gen.init(ws);

      const block = ws.newBlock('math_change');
      block.getField('VAR')!.setValue(varModel.getId());
      const code = gen.forBlock['math_change'](block, gen) as string;
      expect(code).toBe(
        '_State.led_status = (_State.led_status if isinstance(_State.led_status, (int, float)) else 0) + 0\n',
      );
      ws.dispose();
    });
  });

  describe('finish() — reset between calls', () => {
    it('produces clean output on a second workspaceToCode call', () => {
      const ws = makeWorkspace();
      addUsedVar(ws, 'x');
      const gen = new ArduinoPythonGenerator();

      gen.init(ws);
      gen.finish('');

      // Second call must not accumulate state from the first
      gen.init(ws);
      const out = gen.finish('');
      const matches = out.match(/class _State/g) ?? [];
      expect(matches.length).toBe(1);
      ws.dispose();
    });
  });
});
