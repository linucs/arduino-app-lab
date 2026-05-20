import { ArduinoAppFilesService } from '@cloud-editor-mono/domain/src/services/services-by-app/app-lab';

import {
  CreateFolder,
  GetFileContent,
  GetFileTree,
  ImportFileToAppFromPath,
  ImportFolderToAppFromPath,
  IsDirectory,
  RemoveFile,
  RenameFile,
  RenameFolder,
  SelectFilesDialog,
  SelectFolderDialog,
  WriteFileContent,
} from '../../wailsjs/go/app/App';
import { OnFileDrop, OnFileDropOff } from '../../wailsjs/runtime/runtime';
import { mapFSNode, mapFSNodeToFlat } from './orchestratorService.mapper';

const DEFAULT_EXTENSIONLESS_FILE_CONTENT =
  'Switch the .txt extension to something like .py or .ino to see syntax highlighting.';

function getDefaultFileContent(fileExtension: string): string {
  return !fileExtension ? DEFAULT_EXTENSIONLESS_FILE_CONTENT : '';
}

export const getAppFileTree: ArduinoAppFilesService['getAppFileTree'] =
  async function (id: string) {
    const file = await GetFileTree(id);
    return [mapFSNode(file)];
  };

export const getAppFiles: ArduinoAppFilesService['getAppFiles'] =
  async function (id: string) {
    const fileTree = await GetFileTree(id);

    const flatFiles = mapFSNodeToFlat(fileTree);

    return {
      filesList: flatFiles,
      fileTree: [mapFSNode(fileTree)],
    };
  };

export const getAppFileContent: ArduinoAppFilesService['getAppFileContent'] =
  async function (id: string) {
    return GetFileContent(id);
  };

export const saveAppFile: ArduinoAppFilesService['saveAppFile'] =
  async function (path: string, content: string) {
    return WriteFileContent(path, content);
  };

export const createAppFile: ArduinoAppFilesService['createAppFile'] =
  async function (path: string, content: string = '') {
    // If no content is provided, check if the file has no extension
    if (!content) {
      // Extract only the filename from the path and check if it has an extension
      const fileName = path.split('/').pop() || '';
      const hasExtension = fileName.includes('.');
      const fileExtension = hasExtension ? fileName.split('.').pop() || '' : '';
      const defaultContent = getDefaultFileContent(fileExtension);
      return WriteFileContent(path, defaultContent);
    }
    return WriteFileContent(path, content);
  };

export const renameAppFile: ArduinoAppFilesService['renameAppFile'] =
  async function (path: string, newName: string, nodeType?: 'file' | 'folder') {
    if (nodeType === 'folder') {
      return RenameFolder(path, newName);
    } else {
      return RenameFile(path, newName);
    }
  };

const directoryCache = new Map<string, boolean>();

export const moveAppFile: ArduinoAppFilesService['moveAppFile'] =
  async function (fromPath: string, toPath: string) {
    // Check cache first
    let isDirectory = directoryCache.get(fromPath);

    if (isDirectory === undefined) {
      try {
        isDirectory = await IsDirectory(fromPath);
        // Cache the result for future use
        directoryCache.set(fromPath, isDirectory);
      } catch (error) {
        console.error('Error determining file type:', error);
      }
    }

    return isDirectory
      ? RenameFolder(fromPath, toPath)
      : RenameFile(fromPath, toPath);
  };

export const removeAppFile: ArduinoAppFilesService['removeAppFile'] =
  async function (path: string) {
    return RemoveFile(path);
  };

export const createAppFolder: ArduinoAppFilesService['createAppFolder'] =
  async function (path: string) {
    return CreateFolder(path);
  };

export const importResourceToAppFromPath: ArduinoAppFilesService['importResourceToAppFromPath'] =
  async function (
    remoteDir: string,
    filePath: string,
    isFolder?: boolean,
    newFileName?: string,
  ) {
    let result;

    if (isFolder) {
      result = await ImportFolderToAppFromPath(
        remoteDir,
        filePath,
        newFileName ?? '',
      );
    } else {
      result = await ImportFileToAppFromPath(
        remoteDir,
        filePath,
        newFileName ?? '',
      );
    }

    const name = result.split('/').pop() ?? '';
    return { id: result, name };
  };

export const importDroppedResourceToApp: ArduinoAppFilesService['importDroppedResourceToApp'] =
  function (callback) {
    OnFileDrop((x: number, y: number, paths: string[]) => {
      const element = document.elementFromPoint(x, y);

      if (!element || !element.closest('[data-native-dropzone="true"]')) {
        return;
      }

      callback(paths);
    }, false);

    return () => {
      OnFileDropOff();
    };
  };

export const selectResourcePathToImport: ArduinoAppFilesService['selectResourcePathToImport'] =
  async function (remoteDir, isFolder = false) {
    try {
      if (isFolder) {
        const result = await SelectFolderDialog(remoteDir);
        return result || null;
      } else {
        const result = await SelectFilesDialog(remoteDir);
        return result && result.length > 0 ? result : null;
      }
    } catch (error) {
      console.error('Error opening dialog:', error);
      return null;
    }
  };

export const saveBlocksAndCode: ArduinoAppFilesService['saveBlocksAndCode'] =
  async function (
    sidecarPath: string,
    blocksJson: string,
    sourcePath: string,
    generatedCode: string,
  ) {
    // Two sequential writes. If the second fails after the first succeeded,
    // attempt to remove the sidecar so the source file is not left with a
    // dangling read-only override on subsequent loads.
    await WriteFileContent(sidecarPath, blocksJson);
    try {
      await WriteFileContent(sourcePath, generatedCode);
    } catch (error) {
      try {
        await RemoveFile(sidecarPath);
      } catch (rollbackError) {
        console.error(
          'saveBlocksAndCode: rollback of sidecar failed',
          rollbackError,
        );
      }
      throw error;
    }
  };
