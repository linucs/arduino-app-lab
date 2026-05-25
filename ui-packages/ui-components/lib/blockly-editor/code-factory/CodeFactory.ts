import * as Blockly from 'blockly';

import type {
  BlockDefinition,
  CatalogEntry,
  CodegenPrecedence,
  Dependency,
  Implementation,
} from '@cloud-editor-mono/domain/src/services/block-catalog-service';

import type { RuntimeAdapter } from '../adapters/runtimeAdapter.type';
import { getGenerator } from './generatorRegistry';
import { applyBlockCodegen, applyCodegenSections } from './templateEngine';

// Module-level dedup for Blockly.Blocks global state (codegen.md §6).
// defineBlocksWithJsonArray writes into the global Blockly.Blocks registry;
// calling it twice with the same type produces a warning. React StrictMode,
// HMR, and file switches all re-trigger loadCatalogEntries — this Set gates
// the registration so each type is defined at most once per session.
const registeredBlockTypes = new Set<string>();

// Schema precedence strings → numeric values. Uses conservative (tight)
// values so parent blocks in either generator wrap correctly.
const PRECEDENCE: Record<CodegenPrecedence, number> = {
  ATOMIC: 0,
  UNARY_PREFIX: 3,
  MULTIPLICATION: 5,
  ADDITION: 6,
  RELATIONAL: 9,
  EQUALITY: 10,
  LOGICAL_AND: 14,
  LOGICAL_OR: 15,
  NONE: 99,
};

// Default colour for catalog-generated sub-categories (Digital, Analog, Serial, …).
const CATALOG_CATEGORY_COLOUR = '#607D8B';

interface CategoryNode {
  blocks: string[];
  children: Map<string, CategoryNode>;
}

export class CodeFactory {
  private readonly adapter: RuntimeAdapter;
  private readonly collectedDeps: Dependency[] = [];
  private readonly categoryTree = new Map<string, CategoryNode>();

  constructor(adapter: RuntimeAdapter) {
    this.adapter = adapter;
  }

  loadCatalogEntries(
    entries: CatalogEntry[],
    categoryColours: Record<string, string> = {},
  ): void {
    for (const entry of entries) {
      const impl = entry.implementations.find(
        (i) => i.runtime === this.adapter.runtime,
      );
      if (!impl) continue;

      this.collectDependencies(impl);

      const topCategory = entry.category.split('::')[0];
      const fallbackColour = categoryColours[topCategory];

      for (const blockDef of impl.blocks) {
        if (this.registerBlock(blockDef, impl, fallbackColour)) {
          this.addToCategory(entry.category, blockDef.blockly.type);
        }
      }
    }
  }

  generateCode(workspace: Blockly.Workspace): string {
    return this.adapter.generator.workspaceToCode(workspace);
  }

  getCollectedDependencies(): readonly Dependency[] {
    return this.collectedDeps;
  }

  getCatalogToolboxCategories(): Blockly.utils.toolbox.ToolboxItemInfo[] {
    const result: Blockly.utils.toolbox.ToolboxItemInfo[] = [];
    for (const [name, node] of this.categoryTree) {
      result.push(this.buildCategory(name, node));
    }
    return result;
  }

  // ------- private -------

  private registerBlock(
    blockDef: BlockDefinition,
    impl: Implementation,
    fallbackColour?: string,
  ): boolean {
    const blockType = blockDef.blockly.type;

    this.lintDropdownBooleans(blockDef);

    if (blockDef.generator) {
      return this.registerImperativeBlock(blockDef, impl, fallbackColour);
    }
    if (blockDef.codegen) {
      return this.registerDeclarativeBlock(blockDef, impl, fallbackColour);
    }

    console.warn(
      `[CodeFactory] refusing block "${blockType}": no codegen and no generator`,
    );
    return false;
  }

  // Imperative tier: look up a registered TS generator class by name.
  // Refuse the block entirely if the class isn't found (codegen.md §4).
  private registerImperativeBlock(
    blockDef: BlockDefinition,
    impl: Implementation,
    fallbackColour?: string,
  ): boolean {
    const blockType = blockDef.blockly.type;
    const generatorName = blockDef.generator!;

    const GeneratorClass = getGenerator(generatorName);
    if (!GeneratorClass) {
      console.warn(
        `[CodeFactory] refusing block "${blockType}": generator "${generatorName}" not registered`,
      );
      return false;
    }

    this.defineBlockType(blockDef, fallbackColour);

    const instance = new GeneratorClass();
    const implCodegen = impl.codegen;

    this.adapter.generator.forBlock[blockType] = (block, generator) => {
      if (implCodegen) applyCodegenSections(implCodegen, generator);
      return instance.generate(block, generator);
    };

    return true;
  }

  // Declarative tier: build a forBlock handler from codegen templates.
  private registerDeclarativeBlock(
    blockDef: BlockDefinition,
    impl: Implementation,
    fallbackColour?: string,
  ): boolean {
    this.defineBlockType(blockDef, fallbackColour);

    const codegen = blockDef.codegen!;
    const implCodegen = impl.codegen;
    const isValueBlock = 'output' in blockDef.blockly;
    const precedence =
      codegen.precedence !== undefined
        ? PRECEDENCE[codegen.precedence]
        : undefined;

    this.adapter.generator.forBlock[blockDef.blockly.type] = (
      block,
      generator,
    ) => {
      if (implCodegen) applyCodegenSections(implCodegen, generator);
      const bodyCode = applyBlockCodegen(codegen, block, generator);

      if (isValueBlock && precedence !== undefined) {
        return [bodyCode.replace(/\n$/, ''), precedence];
      }
      return bodyCode;
    };

    return true;
  }

  // Register the block's JSON definition in the global Blockly.Blocks
  // registry, guarded by the module-level dedup Set (codegen.md §6).
  private defineBlockType(blockDef: BlockDefinition, fallbackColour?: string): void {
    const blockType = blockDef.blockly.type;
    if (registeredBlockTypes.has(blockType)) return;
    registeredBlockTypes.add(blockType);
    const def =
      fallbackColour && blockDef.blockly.colour === undefined
        ? { ...blockDef.blockly, colour: fallbackColour }
        : blockDef.blockly;
    Blockly.common.defineBlocksWithJsonArray([def]);
  }

  private collectDependencies(impl: Implementation): void {
    if (!impl.dependencies) return;
    for (const dep of impl.dependencies) {
      const exists = this.collectedDeps.some(
        (d) => d.type === dep.type && d.name === dep.name,
      );
      if (!exists) this.collectedDeps.push(dep);
    }
  }

  // Insert a block type into the category tree. Categories with '::'
  // separators produce nested nodes (e.g. 'I/O::Digital' → I/O > Digital).
  private addToCategory(category: string, blockType: string): void {
    const parts = category.split('::');
    const topName = parts[0];

    if (!this.categoryTree.has(topName)) {
      this.categoryTree.set(topName, { blocks: [], children: new Map() });
    }
    let node = this.categoryTree.get(topName)!;

    for (let i = 1; i < parts.length; i++) {
      const childName = parts[i];
      if (!node.children.has(childName)) {
        node.children.set(childName, { blocks: [], children: new Map() });
      }
      node = node.children.get(childName)!;
    }

    node.blocks.push(blockType);
  }

  private buildCategory(
    name: string,
    node: CategoryNode,
  ): Blockly.utils.toolbox.StaticCategoryInfo {
    const contents: Blockly.utils.toolbox.ToolboxItemInfo[] = [];

    for (const blockType of node.blocks) {
      contents.push({ kind: 'block', type: blockType } as Blockly.utils.toolbox.BlockInfo);
    }

    for (const [childName, childNode] of node.children) {
      contents.push(this.buildCategory(childName, childNode));
    }

    return {
      kind: 'category',
      name,
      contents,
      colour: CATALOG_CATEGORY_COLOUR,
      id: undefined,
      categorystyle: undefined,
      cssconfig: undefined,
      hidden: undefined,
    };
  }

  // YAML boolean lint (verification item 30): warn if any field_dropdown
  // option value is a JS boolean, which signals unquoted on/off/yes/no in
  // the YAML source (PyYAML 1.1 coerces these to booleans).
  private lintDropdownBooleans(blockDef: BlockDefinition): void {
    const blockly = blockDef.blockly;
    for (const key of Object.keys(blockly)) {
      if (!key.startsWith('args')) continue;
      const args = blockly[key];
      if (!Array.isArray(args)) continue;
      for (const arg of args) {
        if (
          arg?.type !== 'field_dropdown' ||
          !Array.isArray(arg.options)
        ) continue;
        for (const opt of arg.options as unknown[][]) {
          if (Array.isArray(opt) && typeof opt[1] === 'boolean') {
            console.warn(
              `[CodeFactory] YAML boolean coercion: block "${blockly.type}" ` +
              `field_dropdown option ${JSON.stringify(opt)} has boolean value — ` +
              `likely unquoted on/off/yes/no in YAML source`,
            );
          }
        }
      }
    }
  }
}
