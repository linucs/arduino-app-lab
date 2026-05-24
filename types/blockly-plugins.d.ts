// Ambient declarations for @blockly/* packages that ship no .d.ts files.

declare module '@blockly/plugin-typed-variable-modal' {
  import type * as Blockly from 'blockly';

  export class TypedVariableModal {
    constructor(
      workspace: Blockly.WorkspaceSvg,
      callbackKey: string,
      types: [string, string][],
      locale?: Record<string, string>,
    );
    init(): void;
    dispose(): void;
    show(): void;
    hide(): void;
  }
}

declare module '@blockly/block-plus-minus' {}
