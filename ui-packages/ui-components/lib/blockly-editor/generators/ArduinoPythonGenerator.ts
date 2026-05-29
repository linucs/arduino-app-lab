import * as Blockly from 'blockly';
import { PythonGenerator, pythonGenerator } from 'blockly/python';

import { FieldParamInput } from '../custom-fields/FieldParamInput';

// `App` is always emitted by finish() — reserve it so a user variable
// named "App" doesn't shadow the import.
const ARDUINO_RESERVED = ['App'];

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
    this.addReservedWords(ARDUINO_RESERVED.join(','));
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
  }

  // PythonGenerator.init() writes ALL workspace VariableModels as "x = None"
  // into definitions_.variables — including procedure parameters. Parameters
  // must not appear as module-level declarations: they already appear in the
  // function signature. Override to rebuild definitions_.variables after the
  // parent runs, excluding variables that are parameters of any procedure or
  // callback block.
  override init(workspace: Blockly.Workspace): void {
    super.init(workspace);

    const paramVarIds = new Set<string>();
    for (const block of workspace.getAllBlocks(false)) {
      if (
        block.type === 'procedures_defnoreturn' ||
        block.type === 'procedures_defreturn'
      ) {
        for (const v of block.getVarModels()) paramVarIds.add(v.getId());
      }
      for (const input of block.inputList) {
        for (const field of input.fieldRow) {
          if (field instanceof FieldParamInput) {
            const varId = field.getVarId();
            if (varId) paramVarIds.add(varId);
          }
        }
      }
    }

    // Pre-register parameter variables in nameDB_. populateVariables only sees
    // variables blocks expose via getVarModels(); FieldParamInput owns its
    // variable but doesn't expose it, so getVariableName(varId) would fall
    // through to sanitising the raw varId whenever the param isn't referenced
    // by a variables_get block inside BODY.
    for (const varId of paramVarIds) {
      this.getVariableName(varId);
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
    const decls: string[] = [];
    const helpers: string[] = [];
    const setupLines: string[] = [];
    for (const key of Object.keys(this.definitions_)) {
      const value = this.definitions_[key];
      if (key === 'variables') continue;
      if (key.startsWith('import_')) imports.push(value);
      else if (key.startsWith('decl_')) decls.push(value);
      else if (key.startsWith('func_') || key.startsWith('%')) helpers.push(value);
      else if (key.startsWith('setup_')) setupLines.push(value);
      // Catch-all: standard Blockly Python handlers add imports under
      // unprefixed keys (e.g. 'from_numbers_import_Number'). Heuristic:
      // if the value looks like an import statement, treat it as one;
      // otherwise place it in declarations.
      else if (/^(?:import |from )/.test(value)) imports.push(value);
      else decls.push(value);
    }
    imports.push('from arduino.app_utils import App');

    const varsDef = this.definitions_['variables'];
    const varNames = varsDef
      ? varsDef.split('\n').map((l) => l.split(' = ')[0].trim()).filter(Boolean)
      : [];
    const globalLine = varNames.length
      ? `${this.INDENT}global ${varNames.join(', ')}\n`
      : '';

    // Inject `global` declarations into decl_* function definitions that
    // reference module-level variables. Without this, Python treats any
    // assigned variable as function-local, causing UnboundLocalError at
    // runtime (e.g. `led_status = not led_status` inside a Bridge handler).
    const injectGlobals = (decl: string): string => {
      if (!varNames.length) return decl;
      const match = decl.match(/^(def\s+\w+\([^)]*\):\s*\n)/);
      if (!match) return decl;
      const fnBody = decl.slice(match[1].length);
      const used = varNames.filter((v) => fnBody.includes(v));
      if (!used.length) return decl;
      return match[1] + `${this.INDENT}global ${used.join(', ')}\n` + fnBody;
    };

    // The built-in PythonGenerator procedure handlers emit `global` lines
    // that include ALL workspace variables — including FieldParamInput-owned
    // variables from other blocks (e.g. `args` from a Bridge.provide handler).
    // Strip those names so only true module-level variables remain.
    const paramVarNames = new Set<string>();
    for (const varId of this.paramVarIds_) {
      paramVarNames.add(this.getVariableName(varId));
    }
    const cleanGlobals = (helper: string): string => {
      if (!paramVarNames.size) return helper;
      return helper.replace(
        /^( +global )(.+)$/m,
        (line, prefix: string, vars: string) => {
          const cleaned = vars.split(', ').filter((v) => !paramVarNames.has(v));
          return cleaned.length ? prefix + cleaned.join(', ') : '';
        },
      );
    };

    const body = code
      ? globalLine + this.prefixLines(code.replace(/\n+$/, ''), this.INDENT)
      : this.INDENT + this.PASS;

    const sections: string[] = [];
    sections.push('# --- Imports ---\n' + imports.join('\n'));
    if (varsDef) sections.push('# --- Variables ---\n' + varsDef);
    if (decls.length) sections.push('# --- Declarations ---\n' + decls.map(injectGlobals).join('\n\n'));
    if (helpers.length) sections.push('# --- Helper functions ---\n' + helpers.map(cleanGlobals).join('\n\n'));
    if (setupLines.length) sections.push('# --- Setup ---\n' + setupLines.join('\n\n'));
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
