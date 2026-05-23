import {
  addAppBrick as addAppBrickRequest,
  addAppCustomBrick as addAppCustomBrickRequest,
  deleteAppBrick,
  getAppFiles,
  getBricks,
  getUnsavedFilesSubject,
  openFileExternal,
  openLinkExternal,
  renameAppCustomBrick as renameAppCustomBrickRequest,
  selectResourcePathToImport,
  updateAppBrick as updateAppBrickRequest,
  updateAppDetail,
} from '@cloud-editor-mono/domain/src/services/services-by-app/app-lab';
import { importResourceToAppFromPath } from '@cloud-editor-mono/domain/src/services/services-by-app/app-lab';
import {
  AppDetailedInfo,
  BrickCreateUpdateRequest,
  UpdateAppDetailRequest,
} from '@cloud-editor-mono/infrastructure';
import {
  AppLabAppDetailLogic,
  AppLabEditorPanelLogic,
  AppLabEditSectionLogic,
  AppsSection,
  isFileNode,
  isFolderNode,
  TreeNode,
  useI18n,
} from '@cloud-editor-mono/ui-components/lib/components-by-app/app-lab';
import {
  DuplicateFileDialogLogic,
  OnDuplicateConflictParams,
} from '@cloud-editor-mono/ui-components/lib/dialogs/app-lab/duplicate-file-dialog/types';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { WretchError } from 'wretch/resolver';

import { resetModuleScopedState } from '../../../../../lib/app-components/app-lab/utils';
import { useFiles } from '../../../../common/hooks/files';
import { useKeywords } from '../../../../common/hooks/keywords';
import { queryClient } from '../../../../common/providers/data-fetching/QueryProvider';
import { getAppLabFileIcon } from '../../../../common/utils';
import { useBoards } from '../../../hooks/useBoards';
import {
  makeAppBrickDetailLogic,
  useConfigureAppBrickDialog,
} from '../../../hooks/useBrickDetail';
import { useImportResource } from '../../../hooks/useImportResource';
import { useIsBoard } from '../../../hooks/useIsBoard';
import { useNotFound } from '../../../hooks/useNotFound';
import { DETAIL_PATH_BY_SECTION } from '../../../routes/__root';
import { sendAppLabNotification } from '../../notifications';
import { useSketchLibraries } from './hooks/useSketchLibraries';
import { useAddSketchLibraryDialog } from './hooks/useSketchLibrariesDialogs';
import { messages } from './messages';
import { useCreateEditorPanelLogic } from './sub-components/editor-panel/appLabEditorPanel';
import { EditorPanelLogicParams } from './sub-components/editor-panel/appLabEditorPanel.type';
import { useAppDetailFiles } from './sub-components/files/appDetailFiles';
import { useAppDetailRuntimeLogic } from './sub-components/runtime/appDetailRuntime';
import { useCreateAppTitleLogic } from './sub-components/title/appDetailTitle';

const RENAME_MESSAGES = {
  file: {
    success: messages.successfullyRenamedFile,
    error: messages.failedRenameFile,
  },
  folder: {
    success: messages.successfullyRenamedFolder,
    error: messages.failedRenameFolder,
  },
} as const;

const DELETE_MESSAGES = {
  file: {
    success: messages.successfullyDeletedFile,
    error: messages.failedDeleteFile,
  },
  folder: {
    success: messages.successfullyDeletedFolder,
    error: messages.failedDeleteFolder,
  },
} as const;

const defaultOpenFoldersState = {};

export const useAppDetailLogic: AppLabAppDetailLogic = function (
  appId: string,
  section: AppsSection,
): ReturnType<AppLabAppDetailLogic> {
  const [deleteItemDialogOpen, setDeleteItemDialogOpen] = useState(false);
  const [deleteItemFileName, setDeleteItemFileName] = useState<string>('');
  const [deleteItemIsDirectory, setDeleteItemIsDirectory] = useState(false);
  const [pendingDeleteAction, setPendingDeleteAction] = useState<
    (() => Promise<void>) | null
  >(null);
  const navigate = useNavigate({
    from: DETAIL_PATH_BY_SECTION[section || 'examples'],
  });

  const openApp = useCallback(
    (app: AppDetailedInfo) => {
      navigate({
        to: `/${app.example ? 'examples' : 'my-apps'}/${app.id}`,
      });
    },
    [navigate],
  );

  useEffect(() => {
    return () => resetModuleScopedState();
  }, []);

  const { formatMessage } = useI18n();

  const [initialAppBrickTab, setInitialAppBrickTab] = useState<string>();
  const [selectedNode, setSelectedNode] = useState<TreeNode>();
  const [selectedFolder, setSelectedFolderState] = useState<TreeNode>();

  const [conflictQueue, setConflictQueue] = useState<
    Array<OnDuplicateConflictParams>
  >([]);

  const duplicateDialog = conflictQueue[0];

  const handleDuplicateConflict = useCallback(
    (params: OnDuplicateConflictParams) => {
      setConflictQueue((prev) => [...prev, params]);
    },
    [],
  );

  const { data: isBoard } = useIsBoard();

  const [updateOpenFile, setUpdateOpenFile] = useState<
    (currFileId: string, nextFileId: string) => void
    // eslint-disable-next-line @typescript-eslint/no-empty-function
  >(() => () => {});

  const {
    appDetail: app,
    appDetailIsLoading,
    appBricks,
    filesList,
    defaultFile,
    filesContents,
    filesContentsAreLoading,
    allContentsRetrieved,
    fileTree,
    sketchDataIsLoading,
    addAppFile,
    renameAppFile,
    deleteAppFile,
    moveFileHandler,
    createAppFolder,
    refetchAppDetail,
    refetchAppYaml,
    refetchSketchYaml,
    refetchAppBricks,
    refetchAppFiles,
    removeFileFromPending,
  } = useAppDetailFiles(appId, updateOpenFile);

  // Redirect to the correct section if app is not found
  const isAppDetailLoaded = !appDetailIsLoading;
  const shouldRedirect = isAppDetailLoaded && !app?.id;
  useNotFound(shouldRedirect, section);

  const { selectedBoard } = useBoards();
  const storeEntityId = useMemo(() => {
    if (!app) return undefined;

    // For examples, keep same persistence across boards
    if (app.example) return `${app.id}-example`;

    if (selectedBoard?.serial) return `${app.id}-${selectedBoard.serial}`;
    // Fallback
    return app.id;
  }, [app, selectedBoard?.serial]);

  const useFilesPayload = useMemo(() => {
    return {
      bricks: appBricks?.map((brick) => ({
        id: brick.id ?? '',
        name: brick.name ?? '',
        category: brick.category ?? '',
      })),
      defaultFilePath: defaultFile?.path,
      files: filesContents,
      filesAreLoading: filesContentsAreLoading,
      filesContentLoaded: allContentsRetrieved,
      isClassicSketch: false,
      isLibraryRoute: false,
      showSketchSecretsFile: false,
      storeEntityId,
      getUnsavedFilesSubject,
    };
  }, [
    allContentsRetrieved,
    appBricks,
    defaultFile,
    filesContents,
    filesContentsAreLoading,
    storeEntityId,
  ]);

  const {
    mainFile: selectableMainFile,
    unsavedFileIds,
    openFiles,
    selectedFile,
    selectFile,
    updateOpenFile: actualUpdateOpenFile,
    updateOpenFilesOrder,
    closeFile,
    onAppRename,
  } = useFiles(useFilesPayload);

  // Update the updateOpenFile function once we have the actual one
  useEffect(() => {
    setUpdateOpenFile(() => actualUpdateOpenFile);
  }, [actualUpdateOpenFile]);

  const duplicateFileDialogLogic: DuplicateFileDialogLogic = useCallback(
    () => ({
      open: conflictQueue.length > 0,
      fileName: duplicateDialog?.fileName || '',
      conflictType: duplicateDialog?.conflictType || null,

      onOverwrite: async (): Promise<boolean> => {
        if (!duplicateDialog) {
          return false;
        }
        try {
          if (!duplicateDialog.sourcePath || !duplicateDialog.targetPath) {
            console.error('Source or target path is missing');
            return false;
          }
          // For folder-folder conflicts, delete target folder first, then move source
          if (duplicateDialog.conflictType === 'folder-folder') {
            // Close all files in target folder
            const filesInTargetFolder = openFiles.filter((f) =>
              f.fileId.startsWith(duplicateDialog.targetPath + '/'),
            );
            filesInTargetFolder.forEach((f) => closeFile(f.fileId));

            // Delete target folder
            await deleteAppFile(duplicateDialog.targetPath, 'folder');
          } else {
            // For file-file conflicts, close target file if it's open
            if (
              openFiles.some((f) => f.fileId === duplicateDialog.targetPath)
            ) {
              closeFile(duplicateDialog.targetPath);
            }
          }

          if (duplicateDialog.isExternalImport) {
            const isFolder = duplicateDialog.conflictType?.startsWith('folder');
            const targetDir = duplicateDialog.targetPath.includes('/')
              ? duplicateDialog.targetPath.substring(
                  0,
                  duplicateDialog.targetPath.lastIndexOf('/'),
                )
              : '';
            const remoteDir = targetDir
              ? `${app?.path}/${targetDir}`
              : app?.path ?? '';

            await importResourceToAppFromPath(
              remoteDir,
              duplicateDialog.sourcePath,
              isFolder,
            );
            queryClient.invalidateQueries({ queryKey: ['app-files'] });
            queryClient.invalidateQueries({
              queryKey: ['get-batch-app-file-content'],
            });
          } else {
            await moveFileHandler(
              duplicateDialog.sourcePath,
              duplicateDialog.targetPath,
            );
          }
          const isLastItem = conflictQueue.length <= 1;
          setConflictQueue((prev) => prev.slice(1));

          return isLastItem;
        } catch (error) {
          console.error('Failed to overwrite duplicate:', error);
          return false;
        }
      },

      onKeepBoth: async (): Promise<boolean> => {
        try {
          if (!duplicateDialog.sourcePath || !duplicateDialog.targetPath) {
            console.error('Source or target path is missing');
            return false;
          }
          const targetPath = duplicateDialog.targetPath;
          const lastDotIndex = targetPath.lastIndexOf('.');
          const baseName =
            lastDotIndex !== -1
              ? targetPath.substring(0, lastDotIndex)
              : targetPath;
          const extension =
            lastDotIndex !== -1 ? targetPath.substring(lastDotIndex) : '';

          // Helper function to check if a path exists in fileTree
          const checkPathExists = (path: string): boolean => {
            const targetPathRelative = path.replace(app?.path + '/', '');
            const fileExists = filesList?.some(
              (file) => file.path === targetPathRelative,
            );

            const checkFolderExists = (
              nodes: TreeNode[] | undefined,
              target: string,
            ): boolean => {
              if (!nodes) return false;
              for (const node of nodes) {
                if (node.path === target) {
                  return true;
                }
                if (node.type === 'folder' && node.children) {
                  if (checkFolderExists(node.children, target)) {
                    return true;
                  }
                }
              }
              return false;
            };

            const folderExists = checkFolderExists(
              fileTree,
              targetPathRelative,
            );
            return fileExists || folderExists;
          };

          // Incremental naming logic
          let newPath = `${baseName}_copy${extension}`;
          let counter = 1;

          while (checkPathExists(newPath)) {
            newPath = `${baseName}_copy_${counter}${extension}`;
            counter++;
          }

          if (duplicateDialog.isExternalImport) {
            const isFolder = duplicateDialog.conflictType?.startsWith('folder');
            const targetDir = duplicateDialog.targetPath.includes('/')
              ? duplicateDialog.targetPath.substring(
                  0,
                  duplicateDialog.targetPath.lastIndexOf('/'),
                )
              : '';
            const remoteDir = targetDir
              ? `${app?.path}/${targetDir}`
              : app?.path ?? '';
            const newFileName = newPath.split('/').pop() || '';

            await importResourceToAppFromPath(
              remoteDir,
              duplicateDialog.sourcePath,
              isFolder,
              newFileName,
            );
            queryClient.invalidateQueries({ queryKey: ['app-files'] });
            queryClient.invalidateQueries({
              queryKey: ['get-batch-app-file-content'],
            });
          } else {
            await moveFileHandler(duplicateDialog.sourcePath, newPath);
          }

          const isLastItem = conflictQueue.length <= 1;
          setConflictQueue((prev) => prev.slice(1));
          return isLastItem;
        } catch (error) {
          console.error('Failed to keep both:', error);
          return false;
        }
      },

      onOpenChange: (open: boolean): void => {
        if (!open) {
          setConflictQueue([]);
        }
      },
    }),
    [
      conflictQueue,
      duplicateDialog,
      moveFileHandler,
      deleteAppFile,
      app?.path,
      filesList,
      fileTree,
      openFiles,
      closeFile,
    ],
  );

  useEffect(() => {
    if (selectedFile?.fileId) {
      removeFileFromPending(selectedFile.fileId);
    }
  }, [removeFileFromPending, selectedFile]);

  useEffect(() => {
    if (selectedFile?.fileId) {
      setSelectedFolderState(undefined);
    }
  }, [selectedFile?.fileId]);

  const addAppBrick = useCallback(
    async (
      brickId: string,
      params: BrickCreateUpdateRequest = {},
      isCustom = false,
    ): Promise<boolean> => {
      const response = await addAppBrickRequest(appId, brickId, params);
      if (response) {
        await refetchAppYaml();
        await refetchAppBricks();
        setInitialAppBrickTab('examples');
        selectFile(brickId);
        sendAppLabNotification({
          message: formatMessage(
            isCustom
              ? messages.successfullyAddedCustomBrick
              : messages.successfullyAddedBrick,
          ),
          variant: 'success',
        });
      } else {
        sendAppLabNotification({
          message: formatMessage(messages.failedAddBrick),
          variant: 'error',
        });
      }
      return response;
    },
    [appId, refetchAppYaml, refetchAppBricks, selectFile, formatMessage],
  );

  const removeAppBrick = useCallback(
    async (brickId: string): Promise<boolean> => {
      const response = await deleteAppBrick(appId, brickId);
      if (response) {
        await refetchAppYaml();
        await refetchAppBricks();
        closeFile(brickId);
        sendAppLabNotification({
          message: formatMessage(messages.successfullyDeletedBrick),
          variant: 'success',
        });
      } else {
        sendAppLabNotification({
          message: formatMessage(messages.failedDeleteBrick),
          variant: 'error',
        });
      }
      return response;
    },
    [appId, closeFile, formatMessage, refetchAppBricks, refetchAppYaml],
  );

  const addAppCustomBrick = useCallback(
    async (
      appId: string,
      body: {
        name: string;
        description?: string;
      },
    ): Promise<{ id: string } | undefined> => {
      try {
        const response = await addAppCustomBrickRequest(appId, body);

        if (response && response.id) {
          selectFile(response.id);
          await Promise.all([
            refetchAppBricks(),
            refetchAppFiles(),
            refetchAppYaml(),
          ]);
          return response;
        }

        sendAppLabNotification({
          message: formatMessage(messages.failedAddCustomBrick),
          variant: 'error',
        });
      } catch (error) {
        if ((error as WretchError).status === 405) {
          sendAppLabNotification({
            message: formatMessage(messages.updateAppLab),
            variant: 'info',
            actions: [
              {
                text: 'Go to settings',
                onClick: () => navigate({ to: '/settings' }),
              },
            ],
          });
        } else if ((error as WretchError).status === 409) {
          addAppBrick(body.name, undefined, true);
        } else {
          sendAppLabNotification({
            message: formatMessage(messages.failedAddCustomBrick),
            variant: 'error',
          });
        }
      }
    },
    [
      formatMessage,
      selectFile,
      refetchAppBricks,
      refetchAppFiles,
      refetchAppYaml,
      navigate,
      addAppBrick,
    ],
  );

  const renameAppCustomBrick = useCallback(
    async (brickId: string, params: { name: string }): Promise<boolean> => {
      const response = await renameAppCustomBrickRequest(
        appId,
        brickId,
        params,
      );
      if (response) {
        await Promise.all([
          refetchAppBricks(),
          refetchAppFiles(),
          refetchAppYaml(),
        ]);
        sendAppLabNotification({
          message: formatMessage(messages.successfullyRenamedBrick),
          variant: 'success',
        });
      } else {
        sendAppLabNotification({
          message: formatMessage(messages.failedRenameBrick),
          variant: 'error',
        });
      }
      return response;
    },
    [appId, formatMessage, refetchAppBricks, refetchAppFiles, refetchAppYaml],
  );

  const addFileHandler = useCallback(
    async (path: string) => {
      const fullName = path.split('/').pop();
      if (!fullName) {
        console.error('Invalid file name');
        return;
      }
      const [fileName, fileExtension] = fullName.split('.');
      const prevSelectedFileId = selectedFile?.fileId;

      // Check if file already exists
      try {
        const { filesList } = await getAppFiles(app?.path || '');
        const filePath = path.replace(app?.path + '/', '');
        const fileExists = filesList.some((file) => file.path === filePath);

        if (fileExists) {
          sendAppLabNotification({
            message: formatMessage(messages.fileAlreadyExists),
            variant: 'error',
          });
          return;
        }
      } catch (error) {
        console.error('Failed to check file existence:', error);
      }

      // this row auto-open newly created files in editor
      selectFile(path);
      try {
        await addAppFile(path, fileName, fileExtension);
        sendAppLabNotification({
          message: formatMessage(messages.successfullyCreatedFile),
          variant: 'success',
        });
      } catch {
        if (prevSelectedFileId) {
          selectFile(prevSelectedFileId);
        }
        sendAppLabNotification({
          message: formatMessage(messages.failedCreateFile),
          variant: 'error',
        });
      }
    },
    [addAppFile, app?.path, formatMessage, selectFile, selectedFile?.fileId],
  );

  const addFolderHandler = useCallback(
    async (path: string) => {
      const folderName = path.split('/').pop();
      if (!folderName) {
        console.error('Invalid folder name');
        return;
      }

      // Check if folder already exists by checking file tree
      try {
        const { fileTree } = await getAppFiles(app?.path || '');
        const checkFolderExists = (
          nodes: TreeNode[],
          targetPath: string,
        ): boolean => {
          for (const node of nodes) {
            if (node.type === 'folder' && node.path === targetPath) {
              return true;
            }
            if (node.type === 'folder' && node.children) {
              if (checkFolderExists(node.children, targetPath)) {
                return true;
              }
            }
          }
          return false;
        };

        if (checkFolderExists(fileTree, path)) {
          sendAppLabNotification({
            message: formatMessage(messages.folderAlreadyExists),
            variant: 'error',
          });
          return;
        }
      } catch (error) {
        console.error('Failed to check folder existence:', error);
      }

      try {
        await createAppFolder(path);
        sendAppLabNotification({
          message: formatMessage(messages.successfullyCreatedFolder),
          variant: 'success',
        });
      } catch {
        sendAppLabNotification({
          message: formatMessage(messages.failedCreateFolder),
          variant: 'error',
        });
      }
    },
    [app?.path, createAppFolder, formatMessage],
  );

  const renameFileHandler = useCallback(
    async (
      path: string,
      newName: string,
      appendExt?: boolean,
      nodeType?: 'file' | 'folder',
    ): Promise<void> => {
      const folder = path.split('/').slice(0, -1).join('/');
      let newPath = folder ? `${folder}/${newName}` : newName;

      if (appendExt) {
        const file = filesContents?.find(
          (f) => f.id === `${app?.path}/${path}`,
        );
        newPath += file?.extension ? `.${file.extension}` : '';
      }

      // Check if target name already exists
      try {
        const { filesList, fileTree } = await getAppFiles(app?.path || '');
        const targetPath = newPath.replace(app?.path + '/', '');

        // Check files
        const fileExists = filesList.some((file) => file.path === targetPath);

        // Check folders by traversing the tree
        const checkFolderExists = (
          nodes: TreeNode[],
          targetPath: string,
        ): boolean => {
          for (const node of nodes) {
            if (node.type === 'folder' && node.path === targetPath) {
              return true;
            }
            if (node.type === 'folder' && node.children) {
              if (checkFolderExists(node.children, targetPath)) {
                return true;
              }
            }
          }
          return false;
        };

        const folderExists = checkFolderExists(fileTree, targetPath);

        if (fileExists || folderExists) {
          sendAppLabNotification({
            message: formatMessage(
              fileExists
                ? messages.fileAlreadyExistsRename
                : messages.folderAlreadyExistsRename,
            ),
            variant: 'error',
          });
          return;
        }
      } catch (error) {
        console.error('Failed to check rename conflict:', error);
      }

      try {
        updateOpenFile(path, newPath);
        await renameAppFile(path, newPath, nodeType);
        const messages = RENAME_MESSAGES[nodeType || 'file'];
        sendAppLabNotification({
          message: formatMessage(messages.success),
          variant: 'success',
        });
      } catch (error) {
        updateOpenFile(newPath, path);
        const messages = RENAME_MESSAGES[nodeType || 'file'];
        sendAppLabNotification({
          message: formatMessage(messages.error),
          variant: 'error',
        });
      }
    },
    [filesContents, app?.path, formatMessage, updateOpenFile, renameAppFile],
  );

  const deleteFileHandler = useCallback(
    async (path: string, nodeType?: 'file' | 'folder') => {
      const fileName = path.split('/').pop() || '';
      const isDir = nodeType === 'folder';

      const performDelete = async (): Promise<void> => {
        const fileIndex = openFiles.findIndex((f) => f.fileId === path);
        try {
          closeFile(path);
          await deleteAppFile(path);
          // Best-effort cleanup of the `.blocks` sidecar (if any).
          if (!isDir) deleteAppFile(`${path}.blocks`).catch(() => {});
          const messages = DELETE_MESSAGES[nodeType || 'file'];
          sendAppLabNotification({
            message: formatMessage(messages.success),
            variant: 'success',
          });
        } catch {
          selectFile(path, fileIndex);
          const messages = DELETE_MESSAGES[nodeType || 'file'];
          sendAppLabNotification({
            message: formatMessage(messages.error),
            variant: 'error',
          });
        }
      };

      setDeleteItemFileName(fileName);
      setDeleteItemIsDirectory(isDir);
      setPendingDeleteAction(() => performDelete);
      setDeleteItemDialogOpen(true);
    },
    [closeFile, deleteAppFile, formatMessage, openFiles, selectFile],
  );

  const updateAppBrick = useCallback(
    async (
      brickId: string,
      params: BrickCreateUpdateRequest,
    ): Promise<boolean> => {
      const response = await updateAppBrickRequest(appId, brickId, params);
      if (response) {
        await refetchAppYaml();
        await refetchAppBricks();
      }
      return response;
    },
    [appId, refetchAppBricks, refetchAppYaml],
  );

  const updateAppBricks = useCallback(
    async (
      bricks: Record<string, BrickCreateUpdateRequest>,
    ): Promise<boolean> => {
      const responses = await Promise.all(
        Object.entries(bricks).map(([brickId, params]) =>
          updateAppBrickRequest(appId, brickId, params),
        ),
      );
      const response = responses.every((res) => res);
      if (response) {
        await refetchAppYaml();
        await refetchAppBricks();
      }
      return response;
    },
    [appId, refetchAppBricks, refetchAppYaml],
  );

  // If the user clicks a `.blocks` sidecar, open its source file instead
  // — the source's tab mode will auto-default to "blocks" because the sidecar
  // exists. This avoids showing the user the raw JSON envelope.
  const resolveBlocksSidecarToSource = useCallback(
    (fileId?: string): string | undefined => {
      if (!fileId || !fileId.endsWith('.blocks')) return fileId;
      return fileId.slice(0, -'.blocks'.length);
    },
    [],
  );

  const selectFileFromEditor = useCallback(
    (fileId?: string): void => {
      const resolved = resolveBlocksSidecarToSource(fileId);
      if (resolved) {
        removeFileFromPending(resolved);
      }
      selectFile(resolved);
    },
    [removeFileFromPending, selectFile, resolveBlocksSidecarToSource],
  );

  const renameFileFromEditor = useCallback(
    (path: string, newName: string, nodeType?: 'file' | 'folder') =>
      renameFileHandler(path, newName, true, nodeType),
    [renameFileHandler],
  );

  const editorPanelLogicParams: EditorPanelLogicParams = useMemo(() => {
    return {
      appId: app?.id,
      appPath: app?.path,
      appBricks,
      selectedFile,
      selectFile: selectFileFromEditor,
      selectableMainFile,
      unsavedFileIds,
      closeFile,
      updateOpenFilesOrder,
      deleteAppFile: deleteFileHandler,
      renameAppFile: renameFileFromEditor,
      addAppFile: addFileHandler,
      addAppFolder: createAppFolder,
      updateAppBrick,
      initialAppBrickTab,
      sketchDataIsLoading,
      openFiles,
      readOnly: section === 'examples',
      filesList,
    };
  }, [
    app?.id,
    app?.path,
    appBricks,
    selectedFile,
    selectFileFromEditor,
    selectableMainFile,
    unsavedFileIds,
    closeFile,
    updateOpenFilesOrder,
    deleteFileHandler,
    renameFileFromEditor,
    addFileHandler,
    createAppFolder,
    updateAppBrick,
    initialAppBrickTab,
    sketchDataIsLoading,
    openFiles,
    section,
    filesList,
  ]);

  useEffect(() => {
    // selectedNode should always represent the currently open file in the editor
    // not the visually selected folder in the file tree
    if (selectedFile?.fileId) {
      const foundFile = filesList?.find(
        (file) => file.path === selectedFile?.fileId,
      );

      if (
        foundFile &&
        isFileNode(foundFile) &&
        selectedFile?.fileExtension !== 'brick'
      ) {
        // Keep selectedNode as the open file, regardless of folder selection
        setSelectedNode(foundFile);
      }
    } else if (!selectedFile && selectedNode && isFileNode(selectedNode)) {
      // Clear selectedNode when no file is open, but only if it's a file
      setSelectedNode(undefined);
      // Note: if selectedNode is a folder, keep it for file creation operations
    }
  }, [selectedFile?.fileId, filesList, selectedFile, selectedNode]);

  const openExternal = useCallback(() => {
    if (!selectedNode) {
      console.warn('No file selected to open externally');
      return;
    }
    openFileExternal(selectedNode.path);
  }, [selectedNode]);

  const openFilesFolder = useCallback((): void => {
    throw new Error('openFilesFolder not implemented');
  }, []);

  const openExternalLink = useCallback((url: string) => {
    if (!url) {
      console.warn('No URL provided to open externally');
      return;
    }
    openLinkExternal(url);
  }, []);

  const { mutateAsync: updateApp } = useMutation({
    mutationFn: async (request: UpdateAppDetailRequest): Promise<boolean> => {
      if (!app) return false;
      const result = await updateAppDetail(app.id, request);
      if (result === app.id) {
        refetchAppDetail();

        if (Object.hasOwn(request, 'default')) {
          queryClient.invalidateQueries({
            queryKey: ['get-default-app'],
            exact: true,
          });
        }
      } else if (result !== undefined) {
        onAppRename(result || '');
        navigate({
          to: `/${section}/${result}`,
        });
      }
      return result !== undefined;
    },
  });

  const { data: bricks } = useQuery(['list-bricks'], () => getBricks());

  const setSelectedFile = useCallback(
    (node: string | TreeNode | undefined) => {
      if (!node) return;
      setInitialAppBrickTab(undefined);
      const rawPath = typeof node === 'string' ? node : node.path;
      const path = resolveBlocksSidecarToSource(rawPath) ?? rawPath;
      selectFile(path);
      removeFileFromPending(path);

      // Reset selectedFolder when a file is selected
      setSelectedFolderState(undefined);
    },
    [removeFileFromPending, selectFile, resolveBlocksSidecarToSource],
  );

  const setSelectedFolder = useCallback((node: TreeNode | undefined) => {
    // For folders, use separate state for visual selection only
    // This doesn't affect file selection or open files
    setSelectedFolderState(node);
  }, []);

  const {
    libraries,
    librarySearchIsLoading,
    searchSketchLibraries,
    appLibraries,
    appLibrariesById,
    installingLibraryId,
    addSketchLibrary,
    deletingLibraryId,
    deleteSketchLibrary,
    addSketchLibraryError,
  } = useSketchLibraries({
    appId,
    refetchSketchYaml,
    onAddSuccess: () =>
      sendAppLabNotification({
        message: formatMessage(messages.successfullyAddedLibrary),
        variant: 'success',
      }),
    onAddError: () =>
      sendAppLabNotification({
        message: formatMessage(messages.failedAddLibrary),
        variant: 'error',
      }),
    onDeleteSuccess: () =>
      sendAppLabNotification({
        message: formatMessage(messages.successfullyDeletedLibrary),
        variant: 'success',
      }),
    onDeleteError: () =>
      sendAppLabNotification({
        message: formatMessage(messages.failedDeleteLibrary),
        variant: 'error',
      }),
  });

  const {
    openDialog: openAddSketchLibraryDialog,
    dialogLogic: addSketchLibraryDialogLogic,
  } = useAddSketchLibraryDialog({
    libraries,
    librarySearchIsLoading,
    searchSketchLibraries,
    appLibrariesById,
    installingLibraryId,
    addSketchLibrary,
    deletingLibraryId,
    deleteSketchLibrary,
    openExternalLink,
    isBoard,
    addSketchLibraryError,
  });

  const useAppLabEditorPanelLogic: AppLabEditorPanelLogic =
    (): ReturnType<AppLabEditorPanelLogic> => {
      const {
        editorPanelLogic,
        blocksOverwriteDialogLogic,
        blocklyPromptDialogLogic,
      } = useCreateEditorPanelLogic(editorPanelLogicParams);

      const onCopyCode = useCallback(() => {
        (): void =>
          sendAppLabNotification({
            message: formatMessage(messages.codeCopied),
            variant: 'success',
          });
      }, []);

      const sidecarOwnedPath = selectedFile?.fileId
        ? `${selectedFile.fileId}.blocks`
        : undefined;
      const sidecarOwned = !!(
        sidecarOwnedPath &&
        filesList?.some((file) => file.path === sidecarOwnedPath)
      );

      return {
        editorPanelLogic,
        getKeywords: useKeywords,
        onCopyCode,
        openFiles: editorPanelLogicParams.openFiles,
        readOnly: editorPanelLogicParams.readOnly,
        blocksOverwriteDialogLogic,
        blocklyPromptDialogLogic,
        selectedFileFullName: selectedFile?.fileFullName,
        hasSidecar: sidecarOwned,
      };
    };

  const appLabEditorPanelLogic = useCallback(useAppLabEditorPanelLogic, [
    editorPanelLogicParams,
    formatMessage,
  ]);

  const deleteTreeItemDialogLogic = useCallback(
    () => ({
      open: deleteItemDialogOpen,
      fileName: deleteItemFileName,
      isDirectory: deleteItemIsDirectory,
      confirmAction: async (): Promise<boolean> => {
        if (pendingDeleteAction) {
          await pendingDeleteAction();
          return true;
        }
        // no pending action -> error
        return false;
      },
      onOpenChange: (open: boolean): void => {
        setDeleteItemDialogOpen(open);
        if (!open) {
          setPendingDeleteAction(null);
          setDeleteItemFileName('');
          setDeleteItemIsDirectory(false);
        }
      },
    }),
    [
      deleteItemDialogOpen,
      deleteItemFileName,
      deleteItemIsDirectory,
      pendingDeleteAction,
    ],
  );

  const configureAppBrickDialogLogic = useCallback(
    useConfigureAppBrickDialog,
    [],
  );

  const brickDetailLogic = useMemo(
    () => makeAppBrickDetailLogic(appId),
    [appId],
  );

  const {
    activePanel,
    defaultApp,
    setAsDefaultApp,
    configureAppBricksDialogLogic,
    swapRunningAppDialogLogic,
    multipleConsolePanelLogic,
    runtimeActionsLogic,
  } = useAppDetailRuntimeLogic(
    app,
    appBricks,
    fileTree,
    openApp,
    updateApp,
    updateAppBricks,
  );

  const useAppLabEditSectionLogic: AppLabEditSectionLogic =
    (): ReturnType<AppLabEditSectionLogic> => {
      const [importFileDialogOpen, setImportFileDialogOpen] = useState(false);
      const [_importedFileId, setImportedFileId] = useState<
        string | undefined
      >();
      const [importTarget, setImportTarget] = useState({
        path: '',
        isFolder: false,
      });

      const renderIcon = useCallback((node: TreeNode): JSX.Element => {
        if (isFolderNode(node)) {
          return <></>; // No icon for folders, only caret will be shown
        }

        const Icon = getAppLabFileIcon(node.extension.slice(1));

        return <Icon />;
      }, []);

      const handleOpenImportFileDialog = useCallback(
        ({ path = '', isFolder = false }) => {
          setImportTarget({ path, isFolder });
          setImportFileDialogOpen(true);
        },
        [],
      );

      const importFileDialogLogic = useImportResource({
        importResourceDialogOpen: importFileDialogOpen,
        setImportResourceDialogOpen: setImportFileDialogOpen,
        setImportedResourceId: setImportedFileId,
        selectResourcePath: () =>
          selectResourcePathToImport(
            importTarget.path
              ? `${app?.path}/${importTarget.path}`
              : app?.path ?? '',
            importTarget.isFolder,
          ),
        importResourceFromPath: (filePath: string, newFileName?: string) =>
          importResourceToAppFromPath(
            importTarget.path
              ? `${app?.path}/${importTarget.path}`
              : app?.path ?? '',
            filePath,
            importTarget.isFolder,
            newFileName,
          ),
        type: importTarget.isFolder ? 'folder' : 'file',
        invalidateQueries: () => {
          queryClient.invalidateQueries({ queryKey: ['app-files'] });
          queryClient.invalidateQueries({
            queryKey: ['get-batch-app-file-content'],
          });
        },
        nodes: fileTree,
        targetFolderPath: importTarget.path,
        onDuplicateConflict: handleDuplicateConflict,
      });

      return {
        app,
        multipleConsolePanelLogic,
        section,
        appBricks,
        bricks,
        appLibraries,
        fileTree,
        selectedFile,
        selectedFolder,
        selectedNode,
        defaultOpenFoldersState,
        setSelectedFile,
        setSelectedFolder,
        openFilesFolder,
        openExternal,
        openExternalLink,
        addAppBrick,
        deleteAppBrick: removeAppBrick,
        updateAppBrick,
        addAppCustomBrick,
        addFileHandler,
        renameFileHandler,
        deleteFileHandler,
        moveFileHandler,
        addSketchLibraryDialogLogic,
        openAddSketchLibraryDialog,
        deleteSketchLibrary,
        addFolderHandler,
        appLabEditorPanelLogic,
        renderIcon,
        brickDetailLogic,
        configureAppBrickDialogLogic,
        updateOpenFile,
        renameAppCustomBrick,
        onDuplicateConflict: handleDuplicateConflict,
        duplicateFileDialogLogic,
        importFileDialogLogic,
        openImportFileDialog: handleOpenImportFileDialog,
      };
    };

  const appLabEditSectionLogic = useCallback(useAppLabEditSectionLogic, [
    app,
    multipleConsolePanelLogic,
    section,
    appBricks,
    bricks,
    appLibraries,
    fileTree,
    selectedFile,
    selectedFolder,
    selectedNode,
    setSelectedFile,
    setSelectedFolder,
    openFilesFolder,
    openExternal,
    openExternalLink,
    addAppBrick,
    removeAppBrick,
    updateAppBrick,
    addAppCustomBrick,
    addFileHandler,
    renameFileHandler,
    deleteFileHandler,
    moveFileHandler,
    addSketchLibraryDialogLogic,
    openAddSketchLibraryDialog,
    deleteSketchLibrary,
    addFolderHandler,
    appLabEditorPanelLogic,
    brickDetailLogic,
    configureAppBrickDialogLogic,
    updateOpenFile,
    renameAppCustomBrick,
    handleDuplicateConflict,
    duplicateFileDialogLogic,
  ]);

  const { appStatus } = runtimeActionsLogic();

  const appTitleLogic = useCreateAppTitleLogic(
    app,
    appStatus,
    section,
    defaultApp,
    setAsDefaultApp,
    updateApp,
    openApp,
  );
  const { onAppAction } = appTitleLogic();

  return {
    app,
    fileTree,
    activePanel,
    configureAppBricksDialogLogic,
    swapRunningAppDialogLogic,
    onAppAction,
    appTitleLogic,
    appLabEditSectionLogic,
    runtimeActionsLogic,
    updateOpenFile,
    deleteTreeItemDialogLogic,
  };
};
