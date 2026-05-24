export const SIDECAR_FORMAT_VERSION = 1;

export type BlocklyLanguage = 'cpp' | 'python';

// Runtime is the catalog-facing identifier used by adapters and (in iteration
// 4) by block catalog entries. It is distinct from `BlocklyLanguage`, which is
// the editor-facing display value persisted in the sidecar envelope's
// `language` field for backward compatibility with the on-disk format.
export type Runtime = 'arduino:cpp' | 'arduino:python';

export type BlocklyEditorLogic = () => {
  // 'cpp' covers both `.ino` and `.cpp`; routes the language used by the stub generator.
  language: BlocklyLanguage;
  // Raw sidecar JSON (full envelope) or undefined when no sidecar exists yet
  // (the workspace will start empty). Passed directly rather than through a
  // getter so the editor can reload its workspace when the value changes (e.g.
  // when an async sidecar fetch completes).
  initialBlocks: string | undefined;
  // Called with the serialised workspace JSON and the generated source code each
  // time the workspace changes (after the internal debounce). The owner persists
  // both via `saveBlocksAndCode`.
  onBlocksChange: (blocksJson: string, generatedCode: string) => void;
  // Resolved by the parent: shows a confirmation modal before the very first
  // sidecar is created. Resolve `true` to allow creation, `false` to undo the
  // workspace change.
  onFirstBlockDrop?: () => Promise<boolean>;
  // Stable identifier of the source file the workspace is bound to (used to
  // reset the workspace when the file changes).
  fileId: string;
  // When true, edits in the workspace are blocked (e.g. unsupported sidecar
  // version).
  readOnly?: boolean;
  // Overrides for Blockly's `window.prompt`/`alert`/`confirm`-based dialogs,
  // which are no-ops inside Wails webviews. When provided, the editor wires
  // them via `Blockly.dialog.set{Prompt,Alert,Confirm}` so the built-in
  // variable / function / rename / delete interactions work.
  onPrompt?: (message: string, defaultValue: string) => Promise<string | null>;
  onAlert?: (message: string) => Promise<void>;
  onConfirm?: (message: string) => Promise<boolean>;
  // When provided, replaces @blockly/plugin-typed-variable-modal with a React
  // dialog that matches App Lab's visual style. Called when the user clicks
  // "Create typed variable…" in the flyout; resolves with the chosen name+type
  // or null if cancelled.
  onCreateTypedVariable?: (
    types: [string, string][],
  ) => Promise<{ name: string; type: string } | null>;
};
