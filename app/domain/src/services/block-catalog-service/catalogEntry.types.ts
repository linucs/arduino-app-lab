// Types derived from block-catalog_v1.schema.json (draft-07).
// Keep in sync with the schema: if the schema changes, update here.

export type Runtime = 'arduino:cpp' | 'arduino:python';

export type DisplayName = string | { [locale: string]: string };

export interface LibraryDependency {
  type: 'library';
  name: string;
  minVersion?: string;
}

export interface PipDependency {
  type: 'pip';
  name: string;
  minVersion?: string;
}

export interface BrickDependency {
  type: 'brick';
  name: string;
  variables?: { [key: string]: string };
}

export type Dependency = LibraryDependency | PipDependency | BrickDependency;

export type CodegenPrecedence =
  | 'ATOMIC'
  | 'UNARY_PREFIX'
  | 'MULTIPLICATION'
  | 'ADDITION'
  | 'RELATIONAL'
  | 'EQUALITY'
  | 'LOGICAL_AND'
  | 'LOGICAL_OR'
  | 'NONE';

export interface CodegenSections {
  imports?: string[];
  declarations?: string[];
  setup?: string[];
  helpers?: { [funcName: string]: string };
  cleanup?: string[];
}

export interface BlockCodegen extends CodegenSections {
  body?: string[];
  precedence?: CodegenPrecedence;
  inputDefaults?: { [inputName: string]: unknown };
}

export interface BlockDefinition {
  blockly: {
    type: string;
    [key: string]: unknown;
  };
  codegen?: BlockCodegen;
  generator?: string;
  tags?: string[];
}

export interface Implementation {
  runtime: Runtime;
  dependencies?: Dependency[];
  codegen?: CodegenSections;
  apiReference?: string;
  repository?: string;
  blocks: BlockDefinition[];
}

export interface CatalogEntry {
  id: string;
  displayName: DisplayName;
  category: string;
  docs?: { [key: string]: string };
  implementations: Implementation[];
}
