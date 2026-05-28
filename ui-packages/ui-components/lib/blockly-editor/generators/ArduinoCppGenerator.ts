import * as Blockly from 'blockly';

// C++ standard language keywords reserved in nameDB_ (codegen-iteration-3.md
// step 1). Deliberately excludes Arduino identifiers (setup, loop, pinMode,
// Serial, …) and standard-library names — hardware identifiers enter user
// code as literals from custom-block handlers, not through nameDB_.
const CPP_KEYWORDS = [
  'auto', 'break', 'case', 'catch', 'char', 'class', 'const', 'constexpr',
  'continue', 'default', 'delete', 'do', 'double', 'else', 'enum', 'explicit',
  'extern', 'false', 'float', 'for', 'friend', 'goto', 'if', 'inline', 'int',
  'long', 'mutable', 'namespace', 'new', 'noexcept', 'nullptr', 'operator',
  'private', 'protected', 'public', 'register', 'return', 'short', 'signed',
  'sizeof', 'static', 'static_assert', 'static_cast', 'struct', 'switch',
  'template', 'this', 'thread_local', 'throw', 'true', 'try', 'typedef',
  'typeid', 'typename', 'union', 'unsigned', 'using', 'virtual', 'void',
  'volatile', 'wchar_t', 'while',
  // C++20 additions
  'concept', 'consteval', 'constinit', 'co_await', 'co_return', 'co_yield',
  'requires', 'char8_t',
];

export enum CppOrder {
  ATOMIC = 0,
  FUNCTION_CALL = 2,
  UNARY = 3,
  MULTIPLICATIVE = 5,
  ADDITIVE = 6,
  RELATIONAL = 9,
  EQUALITY = 10,
  LOGICAL_AND = 14,
  LOGICAL_OR = 15,
  CONDITIONAL = 16,
  NONE = 99,
}

const ARITHMETIC_OP: Record<string, { op: string; order: CppOrder }> = {
  ADD: { op: '+', order: CppOrder.ADDITIVE },
  MINUS: { op: '-', order: CppOrder.ADDITIVE },
  MULTIPLY: { op: '*', order: CppOrder.MULTIPLICATIVE },
  DIVIDE: { op: '/', order: CppOrder.MULTIPLICATIVE },
};

const COMPARE_OP: Record<string, string> = {
  EQ: '==',
  NEQ: '!=',
  LT: '<',
  LTE: '<=',
  GT: '>',
  GTE: '>=',
};

const LOGIC_OP: Record<string, { op: string; order: CppOrder }> = {
  AND: { op: '&&', order: CppOrder.LOGICAL_AND },
  OR: { op: '||', order: CppOrder.LOGICAL_OR },
};

export class ArduinoCppGenerator extends Blockly.CodeGenerator {
  // Widened from protected — handler modules under custom-blocks/ write
  // setup_* / include_* / decl_* entries through this map (codegen.md §5).
  public declare definitions_: { [key: string]: string };

  constructor() {
    super('ArduinoCpp');
    this.addReservedWords(CPP_KEYWORDS.join(','));

    this.forBlock['controls_if'] = (block, generator): string => {
      let code = '';
      let clause = 0;
      do {
        const condCode =
          generator.valueToCode(block, 'IF' + clause, CppOrder.NONE) || 'false';
        const bodyCode = generator.statementToCode(block, 'DO' + clause);
        code +=
          (clause === 0 ? 'if (' : ' else if (') +
          condCode +
          ') {\n' +
          bodyCode +
          '}';
        clause++;
      } while (block.getInput('IF' + clause));

      if (block.getInput('ELSE')) {
        const elseCode = generator.statementToCode(block, 'ELSE');
        code += ' else {\n' + elseCode + '}';
      }
      return code + '\n';
    };

    this.forBlock['logic_compare'] = (block, generator): [string, CppOrder] => {
      const op = COMPARE_OP[block.getFieldValue('OP')] ?? '==';
      const order = CppOrder.RELATIONAL;
      const left = generator.valueToCode(block, 'A', order) || '0';
      const right = generator.valueToCode(block, 'B', order) || '0';
      return [`${left} ${op} ${right}`, order];
    };

    this.forBlock['logic_operation'] = (
      block,
      generator,
    ): [string, CppOrder] => {
      const { op, order } = LOGIC_OP[block.getFieldValue('OP')] ?? LOGIC_OP.AND;
      const left = generator.valueToCode(block, 'A', order) || 'false';
      const right = generator.valueToCode(block, 'B', order) || 'false';
      return [`${left} ${op} ${right}`, order];
    };

    this.forBlock['logic_negate'] = (block, generator): [string, CppOrder] => {
      const arg =
        generator.valueToCode(block, 'BOOL', CppOrder.UNARY) || 'false';
      return [`!${arg}`, CppOrder.UNARY];
    };

    this.forBlock['logic_boolean'] = (block): [string, CppOrder] => {
      const v = block.getFieldValue('BOOL') === 'TRUE' ? 'true' : 'false';
      return [v, CppOrder.ATOMIC];
    };

    this.forBlock['controls_repeat_ext'] = (block, generator): string => {
      const repeats =
        generator.valueToCode(block, 'TIMES', CppOrder.NONE) || '0';
      const body = generator.statementToCode(block, 'DO');
      return `for (int _i = 0; _i < ${repeats}; _i++) {\n${body}}\n`;
    };

    this.forBlock['controls_whileUntil'] = (block, generator): string => {
      const until = block.getFieldValue('MODE') === 'UNTIL';
      const cond =
        generator.valueToCode(
          block,
          'BOOL',
          until ? CppOrder.UNARY : CppOrder.NONE,
        ) || 'false';
      const body = generator.statementToCode(block, 'DO');
      return `while (${until ? `!(${cond})` : cond}) {\n${body}}\n`;
    };

    this.forBlock['math_number'] = (block): [string, CppOrder] => {
      const raw = String(block.getFieldValue('NUM'));
      const order = raw.startsWith('-') ? CppOrder.UNARY : CppOrder.ATOMIC;
      return [raw, order];
    };

    this.forBlock['math_arithmetic'] = (
      block,
      generator,
    ): [string, CppOrder] => {
      const opEntry =
        ARITHMETIC_OP[block.getFieldValue('OP')] ?? ARITHMETIC_OP.ADD;
      const left = generator.valueToCode(block, 'A', opEntry.order) || '0';
      const right = generator.valueToCode(block, 'B', opEntry.order) || '0';
      return [`${left} ${opEntry.op} ${right}`, opEntry.order];
    };

    this.forBlock['math_modulo'] = (block, generator): [string, CppOrder] => {
      const left =
        generator.valueToCode(block, 'DIVIDEND', CppOrder.MULTIPLICATIVE) ||
        '0';
      const right =
        generator.valueToCode(block, 'DIVISOR', CppOrder.MULTIPLICATIVE) || '1';
      return [`${left} % ${right}`, CppOrder.MULTIPLICATIVE];
    };

    this.forBlock['text'] = (block): [string, CppOrder] => {
      const raw = String(block.getFieldValue('TEXT'));
      const escaped = raw
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\t/g, '\\t');
      return [`"${escaped}"`, CppOrder.ATOMIC];
    };

    // ---- Variables ----
    // Declarations are contributed to definitions_ so finish() emits them at
    // file scope, not inside loop().

    // Returns the C++ type token and its zero-value initializer for a variable.
    // Used by both the typed (dynamic) and untyped handlers.
    const cppTypeInfo = (
      block: Blockly.Block,
      varId: string,
    ): { type: string; init: string } => {
      const model = block.workspace.getVariableMap().getVariableById(varId);
      const t = model?.getType() || 'int';
      switch (t) {
        // signed integers
        case 'int':    return { type: 'int',    init: '0' };
        case 'long':   return { type: 'long',   init: '0' };
        case 'int8_t': return { type: 'int8_t', init: '0' };
        case 'int16_t':return { type: 'int16_t',init: '0' };
        case 'int32_t':return { type: 'int32_t',init: '0' };
        // unsigned integers
        case 'unsigned int':  return { type: 'unsigned int',  init: '0' };
        case 'unsigned long': return { type: 'unsigned long', init: '0' };
        case 'byte':    return { type: 'byte',    init: '0' };
        case 'word':    return { type: 'word',    init: '0' };
        case 'uint8_t': return { type: 'uint8_t', init: '0' };
        case 'uint16_t':return { type: 'uint16_t',init: '0' };
        case 'uint32_t':return { type: 'uint32_t',init: '0' };
        // floating point
        case 'float':  return { type: 'float',  init: '0.0' };
        case 'double': return { type: 'double', init: '0.0' };
        // other
        case 'bool':   return { type: 'bool',   init: 'false' };
        case 'char':   return { type: 'char',   init: "'\\0'" };
        case 'String': return { type: 'String', init: '""' };
        default:       return { type: 'int',    init: '0' };
      }
    };

    // Typed variable blocks — generated by VariablesDynamic (C++ toolbox).
    this.forBlock['variables_get_dynamic'] = (
      block,
      generator,
    ): [string, CppOrder] => {
      const varId = block.getFieldValue('VAR');
      const name = generator.getVariableName(varId);
      const { type, init } = cppTypeInfo(block, varId);
      generator.definitions_[`decl_var_${name}`] = `${type} ${name} = ${init};`;
      return [name, CppOrder.ATOMIC];
    };

    this.forBlock['variables_set_dynamic'] = (block, generator): string => {
      const varId = block.getFieldValue('VAR');
      const name = generator.getVariableName(varId);
      const { type, init } = cppTypeInfo(block, varId);
      const value = generator.valueToCode(block, 'VALUE', CppOrder.NONE) || init;
      generator.definitions_[`decl_var_${name}`] = `${type} ${name} = ${init};`;
      return `${name} = ${value};\n`;
    };

    // Untyped variable blocks — default to `int` for compatibility.
    this.forBlock['variables_get'] = (block, generator): [string, CppOrder] => {
      const name = generator.getVariableName(block.getFieldValue('VAR'));
      generator.definitions_[`decl_var_${name}`] = `int ${name} = 0;`;
      return [name, CppOrder.ATOMIC];
    };

    this.forBlock['variables_set'] = (block, generator): string => {
      const value = generator.valueToCode(block, 'VALUE', CppOrder.NONE) || '0';
      const name = generator.getVariableName(block.getFieldValue('VAR'));
      generator.definitions_[`decl_var_${name}`] = `int ${name} = 0;`;
      return `${name} = ${value};\n`;
    };

    this.forBlock['math_change'] = (block, generator): string => {
      const delta = generator.valueToCode(block, 'DELTA', CppOrder.ADDITIVE) || '0';
      const name = generator.getVariableName(block.getFieldValue('VAR'));
      generator.definitions_[`decl_var_${name}`] = `int ${name} = 0;`;
      return `${name} += ${delta};\n`;
    };

    // ---- Functions (procedures) ----
    // All params and return values default to `int` — keeps the toolbox usable
    // without a type-inference pass. `void` is used for noreturn definitions.
    // Function bodies are stashed under `func_<name>` so finish() places them
    // at file scope, before setup()/loop().

    const buildDefinition = (
      block: Blockly.Block,
      generator: ArduinoCppGenerator,
      returnType: 'void' | 'int',
    ): null => {
      const name = generator.getProcedureName(block.getFieldValue('NAME'));
      const argIds = block.getVars();
      const args = argIds.map((id) => generator.getVariableName(id));
      const paramList = args.map((a) => `int ${a}`).join(', ');
      const body = generator.statementToCode(block, 'STACK') || '';
      const returnValue =
        returnType === 'int'
          ? generator.valueToCode(block, 'RETURN', CppOrder.NONE) || '0'
          : '';
      const returnLine =
        returnType === 'int' ? `${generator.INDENT}return ${returnValue};\n` : '';
      generator.definitions_[`func_${name}`] =
        `${returnType} ${name}(${paramList}) {\n${body}${returnLine}}\n`;
      return null;
    };

    this.forBlock['procedures_defnoreturn'] = (block, generator): null =>
      buildDefinition(block, generator as ArduinoCppGenerator, 'void');

    this.forBlock['procedures_defreturn'] = (block, generator): null =>
      buildDefinition(block, generator as ArduinoCppGenerator, 'int');

    // ---- cpp_function_def / cpp_function_call / cpp_return ----
    // These replace the generic Blockly procedure blocks for C++.

    this.forBlock['cpp_function_def'] = (block, generator): null => {
      const gen = generator as ArduinoCppGenerator;
      const name = gen.getProcedureName(block.getFieldValue('NAME') || 'myFunction');
      const returnType = block.getFieldValue('RETURN_TYPE') || 'void';

      const params: string[] = [];
      for (let i = 0; block.getInput(`PARAM_${i}`); i++) {
        const type = block.getFieldValue(`TYPE_${i}`) || 'int';
        const paramName = block.getFieldValue(`NAME_${i}`) || `param${i + 1}`;
        params.push(`${type} ${paramName}`);
      }

      const body = generator.statementToCode(block, 'STACK') || '';
      const returnLine =
        returnType !== 'void' ? `${generator.INDENT}return 0;\n` : '';

      gen.definitions_[`func_${name}`] =
        `${returnType} ${name}(${params.join(', ')}) {\n${body}${returnLine}}\n`;
      return null;
    };

    this.forBlock['cpp_function_call'] = (block, generator): string => {
      const name = block.getFieldValue('FUNC_NAME') || '';
      if (!name || name === '__none__') return '';
      const args: string[] = [];
      for (let i = 0; block.getInput(`ARG_${i}`); i++) {
        args.push(generator.valueToCode(block, `ARG_${i}`, CppOrder.NONE) || '0');
      }
      return `${name}(${args.join(', ')});\n`;
    };

    this.forBlock['cpp_function_call_expr'] = (
      block,
      generator,
    ): [string, CppOrder] => {
      const name = block.getFieldValue('FUNC_NAME') || '';
      if (!name || name === '__none__') return ['/* no function selected */', CppOrder.ATOMIC];
      const args: string[] = [];
      for (let i = 0; block.getInput(`ARG_${i}`); i++) {
        args.push(generator.valueToCode(block, `ARG_${i}`, CppOrder.NONE) || '0');
      }
      return [`${name}(${args.join(', ')})`, CppOrder.FUNCTION_CALL];
    };

    this.forBlock['cpp_return'] = (block, generator): string => {
      const value = generator.valueToCode(block, 'VALUE', CppOrder.NONE);
      return value ? `return ${value};\n` : 'return;\n';
    };

    // Logic
    this.forBlock['logic_ternary'] = (block, generator): [string, CppOrder] => {
      const cond = generator.valueToCode(block, 'IF', CppOrder.CONDITIONAL) || 'false';
      const ifTrue = generator.valueToCode(block, 'THEN', CppOrder.CONDITIONAL) || '0';
      const ifFalse = generator.valueToCode(block, 'ELSE', CppOrder.CONDITIONAL) || '0';
      return [`(${cond} ? ${ifTrue} : ${ifFalse})`, CppOrder.CONDITIONAL];
    };

    // Loops
    this.forBlock['controls_for'] = (block, generator): string => {
      const varName = generator.getVariableName(block.getFieldValue('VAR'));
      const from = generator.valueToCode(block, 'FROM', CppOrder.NONE) || '0';
      const to   = generator.valueToCode(block, 'TO',   CppOrder.NONE) || '0';
      const by   = generator.valueToCode(block, 'BY',   CppOrder.NONE) || '1';
      const body = generator.statementToCode(block, 'DO');
      return `for (int ${varName} = ${from}; ${varName} <= ${to}; ${varName} += ${by}) {\n${body}}\n`;
    };

    this.forBlock['controls_flow_statements'] = (block): string => {
      return block.getFieldValue('FLOW') === 'BREAK' ? 'break;\n' : 'continue;\n';
    };

    // Math
    this.forBlock['math_single'] = (block, generator): [string, CppOrder] => {
      const op  = block.getFieldValue('OP');
      const num = generator.valueToCode(block, 'NUM', CppOrder.NONE) || '0';
      switch (op) {
        case 'ROOT':  return [`sqrt(${num})`,      CppOrder.FUNCTION_CALL];
        case 'ABS':   return [`abs(${num})`,       CppOrder.FUNCTION_CALL];
        case 'NEG':   return [`(-${num})`,         CppOrder.UNARY];
        case 'LN':    return [`log(${num})`,       CppOrder.FUNCTION_CALL];
        case 'LOG10': return [`log10(${num})`,     CppOrder.FUNCTION_CALL];
        case 'EXP':   return [`exp(${num})`,       CppOrder.FUNCTION_CALL];
        case 'POW10': return [`pow(10, ${num})`,   CppOrder.FUNCTION_CALL];
        default:      return [`abs(${num})`,       CppOrder.FUNCTION_CALL];
      }
    };

    this.forBlock['math_trig'] = (block, generator): [string, CppOrder] => {
      const op  = block.getFieldValue('OP');
      const num = generator.valueToCode(block, 'NUM', CppOrder.NONE) || '0';
      const toRad   = `(${num}) * M_PI / 180.0`;
      const fromRad = (fn: string) => `${fn} * 180.0 / M_PI` as string;
      switch (op) {
        case 'SIN':  return [`sin(${toRad})`,              CppOrder.FUNCTION_CALL];
        case 'COS':  return [`cos(${toRad})`,              CppOrder.FUNCTION_CALL];
        case 'TAN':  return [`tan(${toRad})`,              CppOrder.FUNCTION_CALL];
        case 'ASIN': return [fromRad(`asin(${num})`),      CppOrder.MULTIPLICATIVE];
        case 'ACOS': return [fromRad(`acos(${num})`),      CppOrder.MULTIPLICATIVE];
        case 'ATAN': return [fromRad(`atan(${num})`),      CppOrder.MULTIPLICATIVE];
        default:     return [`sin(${toRad})`,              CppOrder.FUNCTION_CALL];
      }
    };

    this.forBlock['math_constant'] = (block): [string, CppOrder] => {
      switch (block.getFieldValue('CONSTANT')) {
        case 'PI':           return ['M_PI',           CppOrder.ATOMIC];
        case 'E':            return ['M_E',            CppOrder.ATOMIC];
        case 'GOLDEN_RATIO': return ['1.61803398875',  CppOrder.ATOMIC];
        case 'SQRT2':        return ['M_SQRT2',        CppOrder.ATOMIC];
        case 'SQRT1_2':      return ['M_SQRT1_2',      CppOrder.ATOMIC];
        case 'INFINITY':     return ['INFINITY',       CppOrder.ATOMIC];
        default:             return ['M_PI',           CppOrder.ATOMIC];
      }
    };

    this.forBlock['math_round'] = (block, generator): [string, CppOrder] => {
      const op  = block.getFieldValue('OP');
      const num = generator.valueToCode(block, 'NUM', CppOrder.NONE) || '0';
      switch (op) {
        case 'ROUND':     return [`round(${num})`, CppOrder.FUNCTION_CALL];
        case 'ROUNDUP':   return [`ceil(${num})`,  CppOrder.FUNCTION_CALL];
        case 'ROUNDDOWN': return [`floor(${num})`, CppOrder.FUNCTION_CALL];
        default:          return [`round(${num})`, CppOrder.FUNCTION_CALL];
      }
    };

    this.forBlock['math_number_property'] = (block, generator): [string, CppOrder] => {
      const gen  = generator as ArduinoCppGenerator;
      const prop = block.getFieldValue('PROPERTY');
      const num  = generator.valueToCode(block, 'NUMBER_TO_CHECK', CppOrder.NONE) || '0';
      switch (prop) {
        case 'EVEN':         return [`((int)(${num}) % 2 == 0)`,  CppOrder.EQUALITY];
        case 'ODD':          return [`((int)(${num}) % 2 != 0)`,  CppOrder.EQUALITY];
        case 'WHOLE':        return [`((float)(${num}) == (int)(${num}))`, CppOrder.EQUALITY];
        case 'POSITIVE':     return [`(${num} > 0)`,              CppOrder.RELATIONAL];
        case 'NEGATIVE':     return [`(${num} < 0)`,              CppOrder.RELATIONAL];
        case 'DIVISIBLE_BY': {
          const div = generator.valueToCode(block, 'DIVISOR', CppOrder.NONE) || '1';
          return [`((int)(${num}) % (int)(${div}) == 0)`, CppOrder.EQUALITY];
        }
        case 'PRIME': {
          gen.definitions_['func__isPrime'] =
            'bool _isPrime(long n) {\n' +
            '  if (n < 2) return false;\n' +
            '  for (long i = 2; i * i <= n; i++) { if (n % i == 0) return false; }\n' +
            '  return true;\n' +
            '}';
          return [`_isPrime((long)(${num}))`, CppOrder.FUNCTION_CALL];
        }
        default:
          return [`(${num} > 0)`, CppOrder.RELATIONAL];
      }
    };

    // switch/case
    this.forBlock['controls_switch_case'] = (block, generator): string => {
      const INDENT = generator.INDENT;
      const expr   = generator.valueToCode(block, 'SWITCH_EXPR', CppOrder.NONE) || '0';
      // Re-indents a string that already has 1 INDENT level to 2 INDENT levels.
      const reindent = (code: string): string =>
        code.split('\n').map(l => (l ? INDENT + l : l)).join('\n');

      let code = `switch (${expr}) {\n`;
      for (let i = 0; block.getInput(`CASE_${i}_VAL`); i++) {
        const val  = generator.valueToCode(block, `CASE_${i}_VAL`,  CppOrder.NONE) || '0';
        const body = generator.statementToCode(block, `CASE_${i}_BODY`);
        code += `${INDENT}case ${val}:\n`;
        if (body) code += reindent(body);
        code += `${INDENT}${INDENT}break;\n`;
      }
      const defaultBody = generator.statementToCode(block, 'DEFAULT_BODY');
      if (defaultBody) {
        code += `${INDENT}default:\n`;
        code += reindent(defaultBody);
      }
      code += '}\n';
      return code;
    };

    const buildCallArgs = (
      block: Blockly.Block,
      generator: ArduinoCppGenerator,
    ): string => {
      const argIds = block.getVars();
      return argIds
        .map((_id, i) => generator.valueToCode(block, `ARG${i}`, CppOrder.NONE) || '0')
        .join(', ');
    };

    this.forBlock['procedures_callnoreturn'] = (block, generator): string => {
      const gen = generator as ArduinoCppGenerator;
      const name = gen.getProcedureName(block.getFieldValue('NAME'));
      return `${name}(${buildCallArgs(block, gen)});\n`;
    };

    this.forBlock['procedures_callreturn'] = (
      block,
      generator,
    ): [string, CppOrder] => {
      const gen = generator as ArduinoCppGenerator;
      const name = gen.getProcedureName(block.getFieldValue('NAME'));
      return [`${name}(${buildCallArgs(block, gen)})`, CppOrder.FUNCTION_CALL];
    };

    this.forBlock['procedures_ifreturn'] = (block, generator): string => {
      const cond = generator.valueToCode(block, 'CONDITION', CppOrder.NONE) || 'false';
      const hasReturn = (block as Blockly.Block & { hasReturnValue_?: boolean })
        .hasReturnValue_;
      const value = hasReturn
        ? generator.valueToCode(block, 'VALUE', CppOrder.NONE) || '0'
        : '';
      return `if (${cond}) {\n${generator.INDENT}return${value ? ` ${value}` : ''};\n}\n`;
    };

  }

  // Required because Blockly.CodeGenerator's base init() doesn't create
  // nameDB_ or reset definitions_. Without this, definitions_ would leak
  // entries from prior generations (e.g. setup_led_LED3 lingers after the
  // block is deleted).
  override init(workspace: Blockly.Workspace): void {
    super.init(workspace);
    this.definitions_ = Object.create(null);
    if (!this.nameDB_) {
      this.nameDB_ = new Blockly.Names(this.RESERVED_WORDS_);
    } else {
      this.nameDB_.reset();
    }
    this.nameDB_.setVariableMap(workspace.getVariableMap());
    this.nameDB_.populateVariables(workspace);
    this.nameDB_.populateProcedures(workspace);
  }

  // Walk to the next block in a statement chain. Blockly.CodeGenerator's base
  // scrub_ is a no-op, so without this override only the first block in every
  // chain (top-level stacks AND statement inputs like controls_if's DO branch)
  // would be emitted. PythonGenerator ships its own scrub_; we need ours.
  override scrub_(
    block: Blockly.Block,
    code: string,
    thisOnly = false,
  ): string {
    const nextBlock = block.nextConnection?.targetBlock();
    if (nextBlock && !thisOnly) {
      return code + (this.blockToCode(nextBlock) as string);
    }
    return code;
  }

  // Categorize definitions_ by key prefix and wrap in setup()/loop().
  // Per codegen.md §5, this is the single source of truth — no parallel
  // collection mechanism. Arduino.h is auto-included for .ino files, so
  // iteration-3 blocks emit no include_* entries.
  override finish(code: string): string {
    const includes: string[] = [];
    const decls: string[] = [];
    const funcs: string[] = [];
    const setupLines: string[] = [];

    // Insertion order preserves the order in which handlers ran during
    // workspaceToCode — keeps the generated file stable as the user edits.
    for (const key of Object.keys(this.definitions_)) {
      const value = this.definitions_[key];
      if (key.startsWith('include_') || key.startsWith('import_')) includes.push(value);
      else if (key.startsWith('decl_')) decls.push(value);
      else if (key.startsWith('func_')) funcs.push(value);
      else if (key.startsWith('setup_')) setupLines.push(value);
    }

    const sections: string[] = [];
    if (includes.length) sections.push('// --- Includes ---\n' + includes.join('\n'));
    if (decls.length) sections.push('// --- Declarations ---\n' + decls.join('\n'));
    if (funcs.length) sections.push('// --- Helper functions ---\n' + funcs.join('\n\n'));

    // Separate setup lines with blank lines so each init action stands out.
    const setupBody = setupLines.length
      ? this.prefixLines(setupLines.join('\n\n'), this.INDENT)
      : '';
    sections.push(
      setupBody ? `void setup() {\n${setupBody}\n}` : 'void setup() {\n}',
    );

    const loopBody = code
      ? this.prefixLines(code.replace(/\n+$/, ''), this.INDENT)
      : '';
    sections.push(
      loopBody ? `void loop() {\n${loopBody}\n}` : 'void loop() {\n}',
    );

    // Reset state per Blockly's generator contract: subsequent
    // workspaceToCode invocations must start from a clean slate.
    this.definitions_ = Object.create(null);
    this.nameDB_?.reset();

    return sections.join('\n\n') + '\n';
  }
}
