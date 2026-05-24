import * as Blockly from 'blockly';

import { IBlockCodeGenerator, registerGenerator } from './generatorRegistry';

// FNV-1a hash — identical to templateEngine.ts hashKey so keys are consistent.
function hashKey(value: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(36);
}

// Get the concatenated code from all blocks in a statement input WITHOUT the
// extra indentation that statementToCode adds via prefixLines. When storing
// code in definitions_ sections that finish() already indents (e.g. setup_*),
// using statementToCode would double-indent. blockToCode → scrub_ gives the
// raw unindented concatenation.
function getRawStatementCode(
  block: Blockly.Block,
  inputName: string,
  generator: Blockly.CodeGenerator,
): string {
  const target = block.getInputTargetBlock(inputName);
  if (!target) return '';
  // Strip trailing newlines: finish() adds the surrounding structure
  // (void setup() { ... }) so stored values must not carry trailing whitespace.
  return (generator.blockToCode(target) as string).replace(/\n+$/, '');
}

function writeToDefs(
  generator: Blockly.CodeGenerator,
  prefix: string,
  code: string,
): void {
  if (!code.trim()) return;
  const defs = (generator as unknown as { definitions_: { [k: string]: string } }).definitions_;
  defs[`${prefix}${hashKey(code)}`] = code;
}

class SectionIncludesGenerator implements IBlockCodeGenerator {
  generate(block: Blockly.Block, generator: Blockly.CodeGenerator): string {
    writeToDefs(generator, 'import_', getRawStatementCode(block, 'BODY', generator));
    return '';
  }
}

class SectionDeclarationsGenerator implements IBlockCodeGenerator {
  generate(block: Blockly.Block, generator: Blockly.CodeGenerator): string {
    writeToDefs(generator, 'decl_', getRawStatementCode(block, 'BODY', generator));
    return '';
  }
}

class SectionSetupGenerator implements IBlockCodeGenerator {
  generate(block: Blockly.Block, generator: Blockly.CodeGenerator): string {
    writeToDefs(generator, 'setup_', getRawStatementCode(block, 'BODY', generator));
    return '';
  }
}

class SectionHelpersGenerator implements IBlockCodeGenerator {
  generate(block: Blockly.Block, generator: Blockly.CodeGenerator): string {
    writeToDefs(generator, 'func_', getRawStatementCode(block, 'BODY', generator));
    return '';
  }
}

registerGenerator('SectionIncludesGenerator', SectionIncludesGenerator);
registerGenerator('SectionDeclarationsGenerator', SectionDeclarationsGenerator);
registerGenerator('SectionSetupGenerator', SectionSetupGenerator);
registerGenerator('SectionHelpersGenerator', SectionHelpersGenerator);
