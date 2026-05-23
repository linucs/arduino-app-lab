import * as Blockly from 'blockly';

import { BlockCodegen, CodegenSections } from '@cloud-editor-mono/common';

// Order.NONE for value inputs — lets the generator wrap with parens when needed.
const ORDER_NONE = 99;

// Resolve all {{placeholder}} tokens in a template string against a Blockly block.
//
// Three placeholder forms (codegen.md §Template engine):
//   {{fieldName}}      — block.getFieldValue(name)
//   {{inputName}}      — generator.valueToCode(block, name, ORDER_NONE)
//   {{statementName}}  — generator.statementToCode(block, name)
//
// The placeholder kind is determined by what the block actually has:
//   1. If a field named `name` exists → getFieldValue.
//   2. If a value input named `name` exists → valueToCode.
//   3. If a statement input named `name` exists → statementToCode.
//   4. Falls back to empty string with a console.warn.
//
// Indentation: statementToCode already returns code indented by one level
// (generator.INDENT). The template is responsible for surrounding structure
// (e.g. `if True:\n{{DO}}`). No additional indentation is added here.
export function resolveTemplate(
  template: string,
  block: Blockly.Block,
  generator: Blockly.CodeGenerator,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, name: string) => {
    const field = block.getField(name);
    if (field !== null) {
      return String(block.getFieldValue(name) ?? '');
    }

    const input = block.getInput(name);
    if (input !== null) {
      if (input.type === Blockly.inputs.inputTypes.VALUE) {
        return generator.valueToCode(block, name, ORDER_NONE) || '';
      }
      if (input.type === Blockly.inputs.inputTypes.STATEMENT) {
        return generator.statementToCode(block, name);
      }
    }

    console.warn(`[templateEngine] unknown placeholder "{{${name}}}" on block type "${block.type}"`);
    return '';
  });
}

// Write implementation-level CodegenSections into generator.definitions_.
// Keyed by prefix convention (codegen.md §5):
//   import_*  — #include / import lines
//   decl_*    — global / module-level declarations
//   setup_*   — one-shot init code
//   func_*    — helper functions
//   cleanup_* — teardown code
//
// Keys are derived from the resolved value so dedup is content-addressed.
// Empty strings are skipped.
export function applyCodegenSections(
  sections: CodegenSections,
  generator: Blockly.CodeGenerator,
): void {
  // definitions_ is protected on the base class but declared public on both
  // Arduino subclasses (codegen.md §5). Cast through unknown to satisfy TS.
  const defs = (generator as unknown as { definitions_: { [k: string]: string } }).definitions_;

  for (const line of sections.imports ?? []) {
    if (line) defs[`import_${hashKey(line)}`] = line;
  }
  for (const line of sections.declarations ?? []) {
    if (line) defs[`decl_${hashKey(line)}`] = line;
  }
  for (const line of sections.setup ?? []) {
    if (line) defs[`setup_${hashKey(line)}`] = line;
  }
  for (const [name, body] of Object.entries(sections.helpers ?? {})) {
    if (body) defs[`func_${name}`] = body;
  }
  for (const line of sections.cleanup ?? []) {
    if (line) defs[`cleanup_${hashKey(line)}`] = line;
  }
}

// Write block-level BlockCodegen sections and return the resolved body string.
// The `inputDefaults` map is used as fallback values when a value input is
// unconnected — the template engine substitutes the default rather than ''.
export function applyBlockCodegen(
  codegen: BlockCodegen,
  block: Blockly.Block,
  generator: Blockly.CodeGenerator,
  inputDefaults?: { [inputName: string]: unknown },
): string {
  applyCodegenSections(codegen, generator);

  const defaults = { ...(codegen.inputDefaults ?? {}), ...(inputDefaults ?? {}) };

  const bodyLines = codegen.body ?? [];
  const resolved = bodyLines
    .map((line) => resolveTemplateWithDefaults(line, block, generator, defaults))
    .join('\n');

  return resolved ? resolved + '\n' : '';
}

// Like resolveTemplate but falls back to inputDefaults for unconnected value inputs.
function resolveTemplateWithDefaults(
  template: string,
  block: Blockly.Block,
  generator: Blockly.CodeGenerator,
  defaults: { [name: string]: unknown },
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, name: string) => {
    const field = block.getField(name);
    if (field !== null) {
      return String(block.getFieldValue(name) ?? '');
    }

    const input = block.getInput(name);
    if (input !== null) {
      if (input.type === Blockly.inputs.inputTypes.VALUE) {
        const code = generator.valueToCode(block, name, ORDER_NONE);
        if (code) return code;
        const fallback = defaults[name];
        return fallback !== undefined ? String(fallback) : '';
      }
      if (input.type === Blockly.inputs.inputTypes.STATEMENT) {
        return generator.statementToCode(block, name);
      }
    }

    console.warn(`[templateEngine] unknown placeholder "{{${name}}}" on block type "${block.type}"`);
    return '';
  });
}

// Stable short key derived from content — avoids colons / slashes in definition
// keys that would confuse some Blockly internals.
function hashKey(value: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(36);
}
