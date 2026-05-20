import {
  BrickCreateUpdateRequest,
  BrickInstance,
} from '@cloud-editor-mono/infrastructure';
import {
  FileNode,
  SelectableFileData,
} from '@cloud-editor-mono/ui-components/lib/components-by-app/app-lab';

export interface EditorPanelLogicParams {
  appId?: string;
  appPath?: string;
  appBricks?: BrickInstance[];
  selectedFile?: SelectableFileData;
  selectFile: (fileId?: string, openAtIndex?: number) => void;
  selectableMainFile?: SelectableFileData;
  unsavedFileIds?: Set<string>;
  closeFile: (fileId: string) => void;
  updateOpenFilesOrder: (fileIds: string[]) => void;
  deleteAppFile: (path: string, nodeType?: 'file' | 'folder') => Promise<void>;
  renameAppFile: (
    path: string,
    newName: string,
    nodeType?: 'file' | 'folder',
  ) => Promise<void>;
  addAppFile: (
    path: string,
    fileName: string,
    fileExtension: string,
  ) => Promise<void>;
  initialAppBrickTab?: string;
  updateAppBrick: (
    brickId: string,
    params: BrickCreateUpdateRequest,
  ) => Promise<boolean>;
  sketchDataIsLoading: boolean;
  openFiles: SelectableFileData[];
  readOnly: boolean;
  // Used to detect Blockly sidecars (`<x>.<ext>.blocks`) that mark their
  // sibling source file as blocks-owned (read-only Code tab, default Blocks tab).
  filesList?: FileNode[];
}
