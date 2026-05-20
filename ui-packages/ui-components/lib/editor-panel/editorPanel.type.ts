import { CodeEditorLogic } from '../code-editor';
import { BlocklyEditorLogic } from '../blockly-editor';
import { BrickDetailLogic } from '../components-by-app/app-lab';
import { EditorControlsHandlers } from '../editor-controls/editorControls.type';
import { TabsBarLogic } from '../editor-tabs-bar';
import { CodeBlocksTabMode } from '../editor-toolbar/editor-toolbars/CodeBlocksEditorToolbar';
import { SecretsEditorLogic } from '../secrets-editor';

interface EditorPanelFile {
  id: string;
  ext: string;
  getData: () => string | undefined;
}

export type EditorControlsProps =
  | { hideControls: false; editorControlsHandlers: EditorControlsHandlers }
  | { hideControls: true; editorControlsHandlers: undefined };

export type EditorPanelLogic = () => {
  codeEditorLogic: CodeEditorLogic;
  brickDetailLogic?: BrickDetailLogic;
  secretsEditorLogic: SecretsEditorLogic;
  tabsBarLogic: TabsBarLogic;
  selectedFile?: EditorPanelFile;
  isFullscreen: boolean;
  codeIsFormatting: boolean;
  isConcurrent?: boolean;
  hideTabs?: boolean;
  markdownCanBeRendered?: boolean;
  shouldRenderMarkdown?: boolean;
  setShouldRenderMarkdown?: (value: boolean) => void;
  canSwitchMarkdownMode?: boolean;
  // Code↔Blocks toggle (for `.ino` / `.cpp` / `.py`).
  blocklyEditorLogic?: BlocklyEditorLogic;
  codeBlocksTabMode?: CodeBlocksTabMode;
  setCodeBlocksTabMode?: (mode: CodeBlocksTabMode) => void;
  // True when the open file has a sibling `.blocks` sidecar — when true,
  // the Code view is read-only and the file lands on Blocks by default.
  hasSidecar?: boolean;
  // False when the toggle should be disabled (e.g. unsaved code changes).
  codeBlocksCanBeToggled?: boolean;
  openExternalLink?: (url: string) => void;
  readOnly?: boolean;
} & EditorControlsProps;
