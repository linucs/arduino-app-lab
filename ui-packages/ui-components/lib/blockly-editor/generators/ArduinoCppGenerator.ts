import * as Blockly from 'blockly';

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
  constructor() {
    super('ArduinoCpp');

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
  }

  // Iteration 2 passthrough. Iteration 3 replaces this with setup()/loop()
  // assembly + definitions_ categorization by key prefix.
  override finish(code: string): string {
    return code;
  }
}
