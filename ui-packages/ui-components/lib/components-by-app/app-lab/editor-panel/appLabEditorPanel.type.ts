import { EditorPanelLogic } from '../../../editor-panel';
import { TypedVariableDialogLogic } from '../../../dialogs/app-lab/typed-variable-dialog/typedVariableDialog.type';
import { KeywordMap, SelectableFileData } from '../../shared';
import { BlocksOverwriteDialogLogic } from '../blocks-overwrite-dialog';
import { BlocklyPromptDialogLogic } from '../blockly-prompt-dialog';

export type AppLabEditorPanelLogic = () => {
  editorPanelLogic: EditorPanelLogic;
  getKeywords: () => KeywordMap | undefined;
  onCopyCode: () => void;
  openFiles: SelectableFileData[];
  readOnly: boolean;
  // Drives the modal shown the first time a user drops a block on a source
  // file that doesn't yet have a Blockly sidecar (creating the sidecar will
  // overwrite the existing source). Optional so consumers that don't yet
  // support Blockly can omit it.
  blocksOverwriteDialogLogic?: BlocksOverwriteDialogLogic;
  // Drives the Blockly-replacement modal used in place of `window.prompt`/
  // `alert`/`confirm` (no-ops in Wails webviews). Optional for the same reason.
  blocklyPromptDialogLogic?: BlocklyPromptDialogLogic;
  selectedFileFullName?: string;
  hasSidecar?: boolean;
  typedVariableDialogLogic?: TypedVariableDialogLogic;
};
