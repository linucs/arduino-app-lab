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
  describe('finish() — module-level variables', () => {
    it('emits bare variable declarations at module level', () => {
      const ws = makeWorkspace();
      addUsedVar(ws, 'counter');
      addUsedVar(ws, 'flag');
      const gen = new ArduinoPythonGenerator();
      gen.init(ws);
      const out = gen.finish('');
      expect(out).toContain('# --- Variables ---');
      expect(out).toContain('counter = None');
      expect(out).toContain('flag = None');
      expect(out).not.toContain('_State');
      ws.dispose();
    });

    it('omits variables section when no variables are declared', () => {
      const ws = makeWorkspace();
      const gen = new ArduinoPythonGenerator();
      gen.init(ws);
      const out = gen.finish('');
      expect(out).not.toContain('# --- Variables ---');
      ws.dispose();
    });

    it('variables appear before def loop()', () => {
      const ws = makeWorkspace();
      addUsedVar(ws, 'x');
      const gen = new ArduinoPythonGenerator();
      gen.init(ws);
      const out = gen.finish('');
      expect(out.indexOf('x = None')).toBeLessThan(out.indexOf('def loop()'));
      ws.dispose();
    });
  });

  describe('finish() — global declaration in loop()', () => {
    it('emits global line inside def loop() when variables exist', () => {
      const ws = makeWorkspace();
      addUsedVar(ws, 'counter');
      addUsedVar(ws, 'flag');
      const gen = new ArduinoPythonGenerator();
      gen.init(ws);
      const out = gen.finish('counter = counter + 1\n');
      expect(out).toMatch(/def loop\(\):\n {2}global counter, flag\n/);
      ws.dispose();
    });

    it('omits global line when no variables exist', () => {
      const ws = makeWorkspace();
      const gen = new ArduinoPythonGenerator();
      gen.init(ws);
      const out = gen.finish('print("hello")\n');
      expect(out).not.toContain('global');
      ws.dispose();
    });
  });

  describe('variables_get / variables_set use bare names', () => {
    it('variables_get returns bare name', () => {
      const ws = makeWorkspace();
      const varModel = addUsedVar(ws, 'counter');
      const gen = new ArduinoPythonGenerator();
      gen.init(ws);

      const getBlock = ws.newBlock('variables_get');
      getBlock.getField('VAR')!.setValue(varModel.getId());
      const [code] = gen.forBlock['variables_get'](getBlock, gen) as [string, number];
      expect(code).toBe('counter');
      ws.dispose();
    });

    it('variables_set returns bare assignment', () => {
      const ws = makeWorkspace();
      const varModel = addUsedVar(ws, 'counter');
      const gen = new ArduinoPythonGenerator();
      gen.init(ws);

      const setBlock = ws.newBlock('variables_set');
      setBlock.getField('VAR')!.setValue(varModel.getId());
      const code = gen.forBlock['variables_set'](setBlock, gen) as string;
      expect(code).toBe('counter = 0\n');
      ws.dispose();
    });
  });

  describe('procedures parameter scoping', () => {
    it('global variables are declared at module level', () => {
      const ws = makeWorkspace();
      addUsedVar(ws, 'globalVar');

      const procBlock = ws.newBlock('procedures_defnoreturn');
      const gen = new ArduinoPythonGenerator();
      gen.init(ws);

      const out = gen.finish('');
      expect(out).toContain('globalVar = None');
      ws.dispose();
    });

    it('emits %funcName helpers in the output', () => {
      const ws = makeWorkspace();
      const gen = new ArduinoPythonGenerator();
      gen.init(ws);

      gen.definitions_['%doSomething'] = 'def doSomething(x):\n  print(x)';

      const out = gen.finish('');
      expect(out).toContain('# --- Helper functions ---');
      expect(out).toContain('def doSomething(x):');
      expect(out).toContain('  print(x)');
      ws.dispose();
    });

    it('param variables excluded from module-level declarations', () => {
      const ws = makeWorkspace();

      const procBlock = ws.newBlock('procedures_defnoreturn');
      const paramVar = ws.getVariableMap().createVariable('x', '');
      procBlock.getVarModels = () => [paramVar];

      const usedBlock = ws.newBlock('variables_set');
      usedBlock.getField('VAR')!.setValue(paramVar.getId());

      const gen = new ArduinoPythonGenerator();
      gen.init(ws);
      const out = gen.finish('');

      expect(out).not.toContain('x = None');
      expect(out).not.toContain('global');
      ws.dispose();
    });

    it('only non-param vars get global declaration in loop()', () => {
      const ws = makeWorkspace();

      const procBlock = ws.newBlock('procedures_defnoreturn');
      const paramVar = ws.getVariableMap().createVariable('param1', '');
      procBlock.getVarModels = () => [paramVar];

      addUsedVar(ws, 'counter');

      const gen = new ArduinoPythonGenerator();
      gen.init(ws);
      const out = gen.finish('x = 1\n');

      expect(out).toContain('counter = None');
      expect(out).not.toContain('param1 = None');
      expect(out).toMatch(/global counter/);
      expect(out).not.toMatch(/global.*param1/);
      ws.dispose();
    });
  });

  describe('finish() — global injection in declaration functions', () => {
    it('injects global for variables referenced in a decl_ function', () => {
      const ws = makeWorkspace();
      addUsedVar(ws, 'led_status');
      addUsedVar(ws, 'counter');
      const gen = new ArduinoPythonGenerator();
      gen.init(ws);

      gen.definitions_['decl_handler'] =
        'def _bridge_handler_btn(args):\n  led_status = not led_status\n  print(args)';

      const out = gen.finish('');
      expect(out).toMatch(
        /def _bridge_handler_btn\(args\):\n {2}global led_status\n {2}led_status = not led_status/,
      );
      // counter is not referenced in the handler — should not appear
      expect(out).not.toMatch(/global.*counter.*\n.*led_status = not/);
      ws.dispose();
    });

    it('does not inject global in non-function declarations', () => {
      const ws = makeWorkspace();
      addUsedVar(ws, 'x');
      const gen = new ArduinoPythonGenerator();
      gen.init(ws);

      gen.definitions_['decl_const'] = 'THRESHOLD = 42';

      const out = gen.finish('');
      expect(out).toContain('THRESHOLD = 42');
      // global should only appear in def loop(), not next to THRESHOLD
      const thresholdIdx = out.indexOf('THRESHOLD = 42');
      const nearbyText = out.slice(Math.max(0, thresholdIdx - 30), thresholdIdx);
      expect(nearbyText).not.toContain('global');
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

      gen.init(ws);
      const out = gen.finish('');
      const matches = out.match(/x = None/g) ?? [];
      expect(matches.length).toBe(1);
      ws.dispose();
    });
  });
});
