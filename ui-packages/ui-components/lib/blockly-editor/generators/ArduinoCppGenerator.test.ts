import * as Blockly from 'blockly';
import { describe, expect, it } from 'vitest';

import { ArduinoCppGenerator } from './ArduinoCppGenerator';

function makeWorkspace() {
  return new Blockly.Workspace();
}

function addUsedVar(ws: Blockly.Workspace, name: string, type = '') {
  const model = ws.getVariableMap().createVariable(name, type);
  const block = ws.newBlock('variables_set');
  block.getField('VAR')!.setValue(model.getId());
  return model;
}

function addUsedDynamicVar(ws: Blockly.Workspace, name: string, type: string) {
  const model = ws.getVariableMap().createVariable(name, type);
  const block = ws.newBlock('variables_set_dynamic');
  block.getField('VAR')!.setValue(model.getId());
  return model;
}

describe('ArduinoCppGenerator', () => {
  describe('finish() — basic structure', () => {
    it('emits setup() and loop() even when workspace is empty', () => {
      const ws = makeWorkspace();
      const gen = new ArduinoCppGenerator();
      gen.init(ws);
      const out = gen.finish('');
      expect(out).toContain('void setup() {');
      expect(out).toContain('void loop() {');
      ws.dispose();
    });

    it('places declarations before setup()', () => {
      const ws = makeWorkspace();
      const gen = new ArduinoCppGenerator();
      gen.init(ws);
      gen.definitions_['decl_var_counter'] = 'int counter = 0;';
      const out = gen.finish('');
      expect(out.indexOf('int counter = 0;')).toBeLessThan(out.indexOf('void setup()'));
      ws.dispose();
    });

    it('places func_ entries in helper functions section', () => {
      const ws = makeWorkspace();
      const gen = new ArduinoCppGenerator();
      gen.init(ws);
      gen.definitions_['func_doWork'] = 'void doWork() {\n}\n';
      const out = gen.finish('');
      expect(out).toContain('// --- Helper functions ---');
      expect(out).toContain('void doWork()');
      ws.dispose();
    });
  });

  describe('variable handlers — global declarations', () => {
    it('variables_get emits global int declaration', () => {
      const ws = makeWorkspace();
      const model = addUsedVar(ws, 'counter');
      const gen = new ArduinoCppGenerator();
      gen.init(ws);

      const getBlock = ws.newBlock('variables_get');
      getBlock.getField('VAR')!.setValue(model.getId());
      gen.forBlock['variables_get'](getBlock, gen);

      const out = gen.finish('');
      expect(out).toContain('int counter = 0;');
      ws.dispose();
    });

    it('variables_get_dynamic emits typed declaration', () => {
      const ws = makeWorkspace();
      const model = addUsedDynamicVar(ws, 'temperature', 'float');
      const gen = new ArduinoCppGenerator();
      gen.init(ws);

      const getBlock = ws.newBlock('variables_get_dynamic');
      getBlock.getField('VAR')!.setValue(model.getId());
      gen.forBlock['variables_get_dynamic'](getBlock, gen);

      const out = gen.finish('');
      expect(out).toContain('float temperature = 0.0;');
      ws.dispose();
    });

    it('variables_set_dynamic emits typed declaration and assignment', () => {
      const ws = makeWorkspace();
      const model = addUsedDynamicVar(ws, 'name', 'String');
      const gen = new ArduinoCppGenerator();
      gen.init(ws);

      const setBlock = ws.newBlock('variables_set_dynamic');
      setBlock.getField('VAR')!.setValue(model.getId());
      const code = gen.forBlock['variables_set_dynamic'](setBlock, gen) as string;

      expect(code).toBe('name = "";\n');
      const out = gen.finish('');
      expect(out).toContain('String name = "";');
      ws.dispose();
    });
  });

  describe('procedures parameter scoping', () => {
    it('variables_get skips global decl for procedure params', () => {
      const ws = makeWorkspace();

      const procBlock = ws.newBlock('procedures_defnoreturn');
      const paramVar = ws.getVariableMap().createVariable('x', 'int');
      procBlock.getVarModels = () => [paramVar];

      const gen = new ArduinoCppGenerator();
      gen.init(ws);

      const getBlock = ws.newBlock('variables_get');
      getBlock.getField('VAR')!.setValue(paramVar.getId());
      const [code] = gen.forBlock['variables_get'](getBlock, gen) as [string, number];

      expect(code).toBe('x');
      const out = gen.finish('');
      expect(out).not.toContain('int x = 0;');
      ws.dispose();
    });

    it('variables_get_dynamic skips global decl for procedure params', () => {
      const ws = makeWorkspace();

      const procBlock = ws.newBlock('procedures_defnoreturn');
      const paramVar = ws.getVariableMap().createVariable('val', 'float');
      procBlock.getVarModels = () => [paramVar];

      const gen = new ArduinoCppGenerator();
      gen.init(ws);

      const getBlock = ws.newBlock('variables_get_dynamic');
      getBlock.getField('VAR')!.setValue(paramVar.getId());
      gen.forBlock['variables_get_dynamic'](getBlock, gen);

      const out = gen.finish('');
      expect(out).not.toContain('float val = 0.0;');
      ws.dispose();
    });

    it('variables_set skips global decl for procedure params', () => {
      const ws = makeWorkspace();

      const procBlock = ws.newBlock('procedures_defnoreturn');
      const paramVar = ws.getVariableMap().createVariable('y', '');
      procBlock.getVarModels = () => [paramVar];

      const gen = new ArduinoCppGenerator();
      gen.init(ws);

      const setBlock = ws.newBlock('variables_set');
      setBlock.getField('VAR')!.setValue(paramVar.getId());
      gen.forBlock['variables_set'](setBlock, gen);

      const out = gen.finish('');
      expect(out).not.toContain('int y = 0;');
      ws.dispose();
    });

    it('math_change skips global decl for procedure params', () => {
      const ws = makeWorkspace();

      const procBlock = ws.newBlock('procedures_defnoreturn');
      const paramVar = ws.getVariableMap().createVariable('n', '');
      procBlock.getVarModels = () => [paramVar];

      const gen = new ArduinoCppGenerator();
      gen.init(ws);

      const changeBlock = ws.newBlock('math_change');
      changeBlock.getField('VAR')!.setValue(paramVar.getId());
      const code = gen.forBlock['math_change'](changeBlock, gen) as string;

      expect(code).toBe('n += 0;\n');
      const out = gen.finish('');
      expect(out).not.toContain('int n = 0;');
      ws.dispose();
    });

    it('global vars still get declarations alongside param vars', () => {
      const ws = makeWorkspace();

      const procBlock = ws.newBlock('procedures_defnoreturn');
      const paramVar = ws.getVariableMap().createVariable('param1', 'int');
      procBlock.getVarModels = () => [paramVar];

      const globalModel = addUsedVar(ws, 'globalCounter');

      const gen = new ArduinoCppGenerator();
      gen.init(ws);

      // Access both variables
      const paramGet = ws.newBlock('variables_get');
      paramGet.getField('VAR')!.setValue(paramVar.getId());
      gen.forBlock['variables_get'](paramGet, gen);

      const globalGet = ws.newBlock('variables_get');
      globalGet.getField('VAR')!.setValue(globalModel.getId());
      gen.forBlock['variables_get'](globalGet, gen);

      const out = gen.finish('');
      expect(out).not.toContain('int param1 = 0;');
      expect(out).toContain('int globalCounter = 0;');
      ws.dispose();
    });
  });

  describe('finish() — reset between calls', () => {
    it('produces clean output on a second workspaceToCode call', () => {
      const ws = makeWorkspace();
      const gen = new ArduinoCppGenerator();

      gen.init(ws);
      gen.definitions_['decl_var_old'] = 'int old = 0;';
      gen.finish('');

      gen.init(ws);
      const out = gen.finish('');
      expect(out).not.toContain('old');
      ws.dispose();
    });
  });
});
