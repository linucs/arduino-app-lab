import * as Blockly from 'blockly';

export interface IBlockCodeGenerator {
  generate(block: Blockly.Block, generator: Blockly.CodeGenerator): string | [string, number] | null;
}

export type BlockCodeGeneratorClass = new () => IBlockCodeGenerator;

// Module-level registry for imperative-tier generator classes (codegen.md §11).
// Keys are the string names used in catalog YAML `generator` fields.
// Populated at module load by first-party code; never expanded from catalog data.
const registry = new Map<string, BlockCodeGeneratorClass>();

export function registerGenerator(name: string, cls: BlockCodeGeneratorClass): void {
  registry.set(name, cls);
}

export function getGenerator(name: string): BlockCodeGeneratorClass | undefined {
  return registry.get(name);
}
