import * as Blockly from 'blockly';
import { PythonGenerator, pythonGenerator } from 'blockly/python';

// The built-in Python handlers are attached to the bundled singleton by
// side-effect at module load, not in PythonGenerator's constructor — a fresh
// subclass starts with an empty forBlock. Object.assign copies handler refs
// onto our per-instance map without mutating the singleton.
export class ArduinoPythonGenerator extends PythonGenerator {
  // Widened from protected — handler modules under custom-blocks/ write
  // import_* / decl_* entries through this map (codegen.md §5).
  public declare definitions_: { [key: string]: string };
  private paramVarIds_: Set<string> = new Set();

  constructor() {
    super('ArduinoPython');
    Object.assign(this.forBlock, pythonGenerator.forBlock);

    // match/case (Python 3.10+)
    this.forBlock['controls_switch_case'] = (block, generator): string => {
      const INDENT = generator.INDENT;
      const PASS   = (generator as unknown as { PASS: string }).PASS ?? 'pass';
      const expr   = generator.valueToCode(block, 'SWITCH_EXPR', 0) || '0';
      const reindent = (code: string): string =>
        code.split('\n').map(l => (l ? INDENT + l : l)).join('\n');

      let code = `match ${expr}:\n`;
      for (let i = 0; block.getInput(`CASE_${i}_VAL`); i++) {
        const val  = generator.valueToCode(block, `CASE_${i}_VAL`, 0) || '0';
        const body = generator.statementToCode(block, `CASE_${i}_BODY`) || `${INDENT}${PASS}\n`;
        code += `${INDENT}case ${val}:\n`;
        code += reindent(body);
      }
      const defaultBody = generator.statementToCode(block, 'DEFAULT_BODY');
      if (defaultBody) {
        code += `${INDENT}case _:\n`;
        code += reindent(defaultBody);
      }
      return code;
    };

    this.forBlock['variables_get'] = (block) => {
      const varId = block.getFieldValue('VAR');
      const name = this.getVariableName(varId);
      return [this.paramVarIds_.has(varId) ? name : `_State.${name}`, 0];
    };

    this.forBlock['variables_set'] = (block) => {
      const varId = block.getFieldValue('VAR');
      const name = this.getVariableName(varId);
      const value = this.valueToCode(block, 'VALUE', 0) || 'None';
      const lhs = this.paramVarIds_.has(varId) ? name : `_State.${name}`;
      return `${lhs} = ${value}\n`;
    };

    this.forBlock['math_change'] = (block) => {
      const varId = block.getFieldValue('VAR');
      const name = this.getVariableName(varId);
      const delta = this.valueToCode(block, 'DELTA', 6 /* Order.ADDITIVE */) || '0';
      const ref = this.paramVarIds_.has(varId) ? name : `_State.${name}`;
      return `${ref} = (${ref} if isinstance(${ref}, (int, float)) else 0) + ${delta}\n`;
    };
  }

  // PythonGenerator.init() writes ALL workspace VariableModels as "x = None"
  // into definitions_.variables — including procedure parameters. Parameters
  // must not appear as module-level declarations: they already appear in the
  // function signature. Override to rebuild definitions_.variables after the
  // parent runs, excluding variables that are parameters of any procedure block.
  override init(workspace: Blockly.Workspace): void {
    super.init(workspace);

    const paramVarIds = new Set<string>();
    for (const block of workspace.getAllBlocks(false)) {
      if (
        block.type === 'procedures_defnoreturn' ||
        block.type === 'procedures_defreturn'
      ) {
        for (const id of block.getVars()) paramVarIds.add(id);
      }
    }

    this.paramVarIds_ = paramVarIds;
    if (paramVarIds.size === 0) return;

    const nonParamVars = Blockly.Variables.allUsedVarModels(workspace).filter(
      (v) => !paramVarIds.has(v.getId()),
    );

    if (nonParamVars.length === 0) {
      delete this.definitions_['variables'];
    } else {
      this.definitions_['variables'] = nonParamVars
        .map((v) => `${this.getVariableName(v.getId())} = None`)
        .join('\n');
    }
  }

  // Wraps the body in `def loop():` + `App.run(user_loop=loop)` and prepends
  // import_* / decl_* / setup_* entries from definitions_ (codegen-iteration-3.md).
  // Bypasses PythonGenerator.finish() to keep ordering deterministic
  // (insertion order) and to keep `App.run` after the body, not inside it.
  override finish(code: string): string {
    const imports: string[] = [];
    const others: string[] = [];
    for (const key of Object.keys(this.definitions_)) {
      const value = this.definitions_[key];
      if (key === 'variables') continue;
      if (key.startsWith('import_')) imports.push(value);
      else others.push(value);
    }
    imports.push('from arduino.app_utils import App');

    const varsDef = this.definitions_['variables'];
    const stateClass = varsDef
      ? `class _State:\n${varsDef.split('\n').map((l) => this.INDENT + l).join('\n')}`
      : '';

    const body = code ? this.prefixLines(code.replace(/\n+$/, ''), this.INDENT) : this.INDENT + this.PASS;

    const sections: string[] = [];
    sections.push(imports.join('\n'));
    if (stateClass) sections.push(stateClass);
    if (others.length) sections.push(others.join('\n'));
    sections.push(`def loop():\n${body}`);
    sections.push('App.run(user_loop=loop)');

    // Reset state per Blockly's generator contract: subsequent
    // workspaceToCode invocations must start from a clean slate.
    this.definitions_ = Object.create(null);
    this.paramVarIds_ = new Set();
    this.nameDB_?.reset();

    return sections.join('\n\n') + '\n';
  }
}
