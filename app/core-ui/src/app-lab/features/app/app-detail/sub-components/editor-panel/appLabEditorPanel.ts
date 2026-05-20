import {
  codeInjectionsSubjectNext,
  codeSubjectNext,
  getAppFileContent,
  getBrowser,
  getCodeInjectionsSubject,
  getCodeSubjectById,
  getUnsavedFilesSubject,
  openLinkExternal,
  replaceFileNameInvalidCharacters,
  saveAppFile,
  saveBlocksAndCode,
} from '@cloud-editor-mono/domain/src/services/services-by-app/app-lab';
import {
  BlocklyDialogKind,
  BlocklyEditorLogic,
  BlocklyLanguage,
  BlocklyPromptDialogLogic,
  BlocksOverwriteDialogLogic,
  CodeBlocksTabMode,
  CodeEditorLogic,
  EditorControlsProps,
  EditorPanelLogic,
  mapAssetSources,
  SelectableFileData,
  snackbar,
  TabsBarLogic,
  useI18n,
} from '@cloud-editor-mono/ui-components/lib/components-by-app/app-lab';
import { SecretsEditorLogic } from '@cloud-editor-mono/ui-components/lib/components-by-app/shared';
import { EditorView } from '@codemirror/view';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
  getSelectedCodeObservableValue,
  useCodeChange,
  useCodeInjectionsObservable,
} from '../../../../../../common/hooks/code';
import {
  codeEditorViewInstance,
  useCodeEditorViewInstance,
} from '../../../../../../common/hooks/editor';
import { SKETCH_SECRETS_FILE_ID } from '../../../../../../common/hooks/files';
import { UseCreateSketchFromExisting } from '../../../../../../common/hooks/queries/create.type';
import { getAppLabFileIcon } from '../../../../../../common/utils';
import { makeAppBrickDetailLogic } from '../../../../../hooks/useBrickDetail';
import { EditorPanelLogicParams } from './appLabEditorPanel.type';
import { messages } from './messages';

const BLOCKS_SIDECAR_SUFFIX = '.blocks';
const CODE_BLOCKS_TOGGLEABLE_EXTS = new Set(['ino', 'cpp', 'py']);

let hasExecutedForFile: string | undefined;

function getDataFromFile(
  file?: SelectableFileData,
  appPath?: string,
): () => string | undefined {
  const selectedFileValue = getSelectedCodeObservableValue(
    getCodeSubjectById,
    file?.fileId,
  )?.value;

  if (file?.fileExtension === 'md') {
    return () =>
      mapAssetSources(
        selectedFileValue,
        (path) => '/file-content-assets/' + path,
        appPath,
      );
  }
  return () => selectedFileValue;
}

const isBlocksToggleableExt = (ext?: string): boolean =>
  ext ? CODE_BLOCKS_TOGGLEABLE_EXTS.has(ext) : false;

const sidecarPathForSource = (sourceFileId: string): string =>
  `${sourceFileId}${BLOCKS_SIDECAR_SUFFIX}`;

const sourceFromSidecarPath = (sidecarPath: string): string | undefined => {
  if (!sidecarPath.endsWith(BLOCKS_SIDECAR_SUFFIX)) return undefined;
  return sidecarPath.slice(0, -BLOCKS_SIDECAR_SUFFIX.length);
};

const blocklyLanguageForExt = (ext?: string): BlocklyLanguage =>
  ext === 'py' ? 'python' : 'cpp';

type UseCreateEditorPanelLogic = (params: EditorPanelLogicParams) => {
  editorPanelLogic: EditorPanelLogic;
  blocksOverwriteDialogLogic: BlocksOverwriteDialogLogic;
  blocklyPromptDialogLogic: BlocklyPromptDialogLogic;
};

export const useCreateEditorPanelLogic: UseCreateEditorPanelLogic = function (
  params: EditorPanelLogicParams,
) {
  const {
    appId,
    appPath,
    selectedFile,
    selectFile,
    closeFile,
    updateOpenFilesOrder,
    addAppFile,
    deleteAppFile,
    renameAppFile,
    sketchDataIsLoading,
    selectableMainFile,
    unsavedFileIds,
    openFiles: tabs,
    readOnly,
    filesList,
  } = params;

  const [shouldRenderMarkdown, setShouldRenderMarkdown] = useState(true);
  const [codeBlocksTabOverrides, setCodeBlocksTabOverrides] = useState<
    Map<string, CodeBlocksTabMode>
  >(new Map());
  const [sidecarContents, setSidecarContents] = useState<Map<string, string>>(
    new Map(),
  );

  const queryClient = useQueryClient();
  const { formatMessage } = useI18n();
  const filesWithToastShown = useRef<Set<string>>(new Set());

  // Set of source-file paths that have a sibling `<x>.blocks` sidecar.
  const sidecarSourceSet = useMemo<Set<string>>(() => {
    const set = new Set<string>();
    filesList?.forEach((f) => {
      const source = sourceFromSidecarPath(f.path);
      if (source) set.add(source);
    });
    return set;
  }, [filesList]);

  const hasSidecar = useCallback(
    (fileId?: string): boolean =>
      fileId ? sidecarSourceSet.has(fileId) : false,
    [sidecarSourceSet],
  );

  const isReadonlyFile = (selectedFile?: SelectableFileData): boolean => {
    const readonlyFiles = ['app.yaml', 'sketch/sketch.yaml'];
    if (!selectedFile) return false;

    return readonlyFiles.includes(selectedFile?.fileId);
  };

  // Show notification when a non-editable file is opened (only for sketches, not examples)
  useEffect(() => {
    if (!selectedFile) return;

    const currentFileIsReadonly = isReadonlyFile(selectedFile);
    const fileId = selectedFile.fileId;

    if (hasExecutedForFile && hasExecutedForFile !== fileId) {
      hasExecutedForFile = undefined;
    }

    if (hasExecutedForFile === fileId) {
      return;
    }
    hasExecutedForFile = fileId;

    // Remove files from Set that are no longer in tabs (file was closed)
    const currentTabIds = new Set(tabs.map((t) => t.fileId));
    for (const toastFileId of filesWithToastShown.current) {
      if (!currentTabIds.has(toastFileId)) {
        filesWithToastShown.current.delete(toastFileId);
      }
    }

    if (!currentFileIsReadonly) {
      toast.dismiss();
      return;
    }

    if (
      currentFileIsReadonly &&
      !readOnly &&
      !filesWithToastShown.current.has(fileId)
    ) {
      // Dismiss all existing toasts before showing a new one
      toast.dismiss();

      snackbar({
        message: formatMessage(messages.readOnlyAttempt),
        variant: 'info',
        opts: { duration: 3000 },
      });

      filesWithToastShown.current.add(fileId);
    }
  }, [selectedFile, readOnly, formatMessage, tabs]);

  // Lazily fetch the sidecar content for the currently selected file if it
  // is blocks-owned and we haven't already cached its content.
  useEffect(() => {
    const fileId = selectedFile?.fileId;
    if (!fileId || !appPath) return;
    if (!hasSidecar(fileId)) return;
    if (sidecarContents.has(fileId)) return;
    let cancelled = false;
    (async () => {
      try {
        const sidecarFullPath = `${appPath}/${sidecarPathForSource(fileId)}`;
        const raw = await getAppFileContent(sidecarFullPath);
        if (cancelled) return;
        setSidecarContents((prev) => {
          const next = new Map(prev);
          next.set(fileId, raw);
          return next;
        });
      } catch (error) {
        console.error('Failed to load Blockly sidecar', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedFile?.fileId, appPath, hasSidecar, sidecarContents]);

  // Drop cached sidecar content if its source file no longer has a sidecar
  // (e.g. user deleted the `.blocks` from the file tree). Gated on
  // `sidecarSourceSet` only — gating on `sidecarContents` too would race with
  // `saveBlocks`, which adds the cache entry before `invalidateQueries`
  // refetches the file tree. In that window `sidecarSourceSet` is stale and
  // would cause the just-saved entry to be evicted, forcing an IPC re-fetch
  // and a visible workspace clear → reload after the first block drop.
  useEffect(() => {
    setSidecarContents((prev) => {
      if (prev.size === 0) return prev;
      let changed = false;
      const next = new Map(prev);
      prev.forEach((_, fileId) => {
        if (!sidecarSourceSet.has(fileId)) {
          next.delete(fileId);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [sidecarSourceSet]);

  // Derived: effective tab mode for the open file (override > sidecar-driven default).
  const effectiveTabMode: CodeBlocksTabMode | undefined = useMemo(() => {
    const ext = selectedFile?.fileExtension;
    if (!selectedFile || !isBlocksToggleableExt(ext)) return undefined;
    const override = codeBlocksTabOverrides.get(selectedFile.fileId);
    if (override) return override;
    return hasSidecar(selectedFile.fileId) ? 'blocks' : 'code';
  }, [selectedFile, codeBlocksTabOverrides, hasSidecar]);

  const setCodeBlocksTabMode = useCallback(
    (mode: CodeBlocksTabMode) => {
      if (!selectedFile) return;
      setCodeBlocksTabOverrides((prev) => {
        const next = new Map(prev);
        next.set(selectedFile.fileId, mode);
        return next;
      });
    },
    [selectedFile],
  );

  // BlocksOverwriteDialog state. The dialog resolves a Promise we hold here so
  // the BlocklyEditor's `onFirstBlockDrop` can await user confirmation.
  const [blocksDialogOpen, setBlocksDialogOpen] = useState(false);
  const dialogResolverRef = useRef<((approved: boolean) => void) | null>(null);
  const dialogTargetRef = useRef<{
    sourceFullName: string;
    sidecarFullName: string;
  } | null>(null);

  const openOverwriteDialog = useCallback((): Promise<boolean> => {
    if (!selectedFile) return Promise.resolve(false);
    dialogTargetRef.current = {
      sourceFullName: selectedFile.fileFullName,
      sidecarFullName: `${selectedFile.fileFullName}${BLOCKS_SIDECAR_SUFFIX}`,
    };
    setBlocksDialogOpen(true);
    return new Promise<boolean>((resolve) => {
      dialogResolverRef.current = resolve;
    });
  }, [selectedFile]);

  const resolveDialog = useCallback((approved: boolean) => {
    const resolver = dialogResolverRef.current;
    dialogResolverRef.current = null;
    setBlocksDialogOpen(false);
    if (resolver) resolver(approved);
  }, []);

  const blocksOverwriteDialogLogic: BlocksOverwriteDialogLogic = useCallback(
    () => ({
      sourceFullName: dialogTargetRef.current?.sourceFullName ?? '',
      sidecarFullName: dialogTargetRef.current?.sidecarFullName ?? '',
      reactModalProps: {
        isOpen: blocksDialogOpen,
        onRequestClose: () => resolveDialog(false),
        ariaHideApp: false,
      },
      setIsOpen: setBlocksDialogOpen,
      confirmAction: () => resolveDialog(true),
      cancelAction: () => resolveDialog(false),
      isLoading: false,
    }),
    [blocksDialogOpen, resolveDialog],
  );

  // BlocklyPromptDialog state. Replaces Blockly's default `window.prompt`/
  // `alert`/`confirm` calls (no-ops in Wails webviews) with a React modal that
  // resolves a Promise consumed by the wrappers we hand to
  // `Blockly.dialog.set*` inside `BlocklyEditor`.
  const [blocklyDialogOpen, setBlocklyDialogOpen] = useState(false);
  const [blocklyDialogKind, setBlocklyDialogKind] =
    useState<BlocklyDialogKind>('alert');
  const [blocklyDialogMessage, setBlocklyDialogMessage] = useState('');
  const [blocklyDialogInput, setBlocklyDialogInput] = useState('');
  const blocklyDialogResolverRef = useRef<((approved: boolean) => void) | null>(
    null,
  );
  // Mirrors `blocklyDialogInput` so the resolver — captured at open() time —
  // can read the latest input on confirm without going through a re-render.
  const blocklyDialogInputRef = useRef('');
  useEffect(() => {
    blocklyDialogInputRef.current = blocklyDialogInput;
  }, [blocklyDialogInput]);

  const resolveBlocklyDialog = useCallback(
    (approved: boolean): void => {
      const resolver = blocklyDialogResolverRef.current;
      blocklyDialogResolverRef.current = null;
      setBlocklyDialogOpen(false);
      if (resolver) resolver(approved);
    },
    [],
  );

  const blocklyPrompt = useCallback(
    (message: string, defaultValue: string): Promise<string | null> => {
      setBlocklyDialogKind('prompt');
      setBlocklyDialogMessage(message);
      setBlocklyDialogInput(defaultValue ?? '');
      blocklyDialogInputRef.current = defaultValue ?? '';
      setBlocklyDialogOpen(true);
      return new Promise<string | null>((resolve) => {
        blocklyDialogResolverRef.current = (approved: boolean): void => {
          resolve(approved ? blocklyDialogInputRef.current : null);
        };
      });
    },
    [],
  );

  const blocklyAlert = useCallback((message: string): Promise<void> => {
    setBlocklyDialogKind('alert');
    setBlocklyDialogMessage(message);
    setBlocklyDialogOpen(true);
    return new Promise<void>((resolve) => {
      blocklyDialogResolverRef.current = (): void => resolve();
    });
  }, []);

  const blocklyConfirm = useCallback((message: string): Promise<boolean> => {
    setBlocklyDialogKind('confirm');
    setBlocklyDialogMessage(message);
    setBlocklyDialogOpen(true);
    return new Promise<boolean>((resolve) => {
      blocklyDialogResolverRef.current = (approved: boolean): void =>
        resolve(approved);
    });
  }, []);

  const blocklyPromptDialogLogic: BlocklyPromptDialogLogic = useCallback(
    () => ({
      kind: blocklyDialogKind,
      message: blocklyDialogMessage,
      inputValue: blocklyDialogInput,
      setInputValue: setBlocklyDialogInput,
      reactModalProps: {
        isOpen: blocklyDialogOpen,
        onRequestClose: () => resolveBlocklyDialog(false),
        ariaHideApp: false,
      },
      setIsOpen: setBlocklyDialogOpen,
      confirmAction: () => resolveBlocklyDialog(true),
      cancelAction: () => resolveBlocklyDialog(false),
    }),
    [
      blocklyDialogKind,
      blocklyDialogMessage,
      blocklyDialogInput,
      blocklyDialogOpen,
      resolveBlocklyDialog,
    ],
  );

  // Save handler: writes both sidecar and regenerated source atomically, then
  // invalidates the file tree so React Query re-evaluates the sidecar set.
  const saveBlocks = useCallback(
    async (fileId: string, blocksJson: string, generatedCode: string) => {
      if (!appPath) return;
      const sidecarFullPath = `${appPath}/${sidecarPathForSource(fileId)}`;
      const sourceFullPath = `${appPath}/${fileId}`;
      try {
        await saveBlocksAndCode(
          sidecarFullPath,
          blocksJson,
          sourceFullPath,
          generatedCode,
        );
        setSidecarContents((prev) => {
          const next = new Map(prev);
          next.set(fileId, blocksJson);
          return next;
        });
        await queryClient.invalidateQueries(['app-files', appId]);
      } catch (error) {
        console.error('saveBlocksAndCode failed', error);
        snackbar({
          message: formatMessage(messages.blocksSaveFailed),
          variant: 'error',
          opts: { duration: 3000 },
        });
      }
    },
    [appPath, appId, queryClient, formatMessage],
  );

  // BlocklyEditor logic factory. Returns undefined when we know we're waiting
  // for an in-flight sidecar fetch — the EditorPanel will keep the editor
  // un-mounted until the content is ready, avoiding an "empty workspace" flash
  // for a file that actually has saved blocks.
  const blocklyEditorLogic: BlocklyEditorLogic | undefined = useMemo(() => {
    if (!selectedFile) return undefined;
    const ext = selectedFile.fileExtension;
    if (!isBlocksToggleableExt(ext)) return undefined;
    const fileId = selectedFile.fileId;
    const sidecarExists = hasSidecar(fileId);
    const cachedContent = sidecarContents.get(fileId);
    if (sidecarExists && cachedContent === undefined) {
      // Still loading the sidecar content.
      return undefined;
    }
    const language = blocklyLanguageForExt(ext);
    return () => ({
      language,
      fileId,
      initialBlocks: cachedContent,
      readOnly: readOnly,
      onBlocksChange: (blocksJson: string, generatedCode: string) =>
        saveBlocks(fileId, blocksJson, generatedCode),
      onFirstBlockDrop: openOverwriteDialog,
      onPrompt: blocklyPrompt,
      onAlert: blocklyAlert,
      onConfirm: blocklyConfirm,
    });
  }, [
    selectedFile,
    hasSidecar,
    sidecarContents,
    readOnly,
    saveBlocks,
    openOverwriteDialog,
    blocklyPrompt,
    blocklyAlert,
    blocklyConfirm,
  ]);

  const codeBlocksCanBeToggled = !(
    selectedFile?.fileId && unsavedFileIds?.has(selectedFile.fileId)
  );

  const useTabsBarLogic = (): ReturnType<TabsBarLogic> => {
    const browser = getBrowser();
    const hasSetHeightOnHover = Boolean(
      browser?.includes('Safari') ||
        browser?.includes('Opera') ||
        browser?.includes('Chrome') ||
        browser?.includes('Edge') ||
        browser?.includes('WebKit'),
    );

    const selectSecretsTab = useCallback(() => {
      selectFile(SKETCH_SECRETS_FILE_ID);
    }, []);

    const validateFileName = useCallback(() => [], []);

    const makeUniqueFileName = useCallback((fileName: string): string => {
      return fileName;
    }, []);

    return {
      tabs,
      selectableMainFile,
      selectedTab: selectedFile,
      selectTab: selectFile,
      selectSecretsTab,
      closeTab: closeFile,
      updateTabOrder: updateOpenFilesOrder,
      unsavedFileIds,
      isReadOnly: true,
      isExampleSketchRoute: false,
      hasSetHeightOnHover,
      validateFileName,
      makeUniqueFileName,
      addFile: addAppFile,
      renameFile: renameAppFile,
      deleteFile: deleteAppFile,
      replaceFileNameInvalidCharacters,
      getFileIcon: getAppLabFileIcon,
      isRenderedMarkdownFile:
        (selectedFile?.fileExtension === 'md' && shouldRenderMarkdown) ||
        selectedFile?.fileExtension === 'brick',
    };
  };

  const tabsBarLogic = useCallback(useTabsBarLogic, [
    tabs,
    selectableMainFile,
    selectedFile,
    selectFile,
    closeFile,
    updateOpenFilesOrder,
    unsavedFileIds,
    addAppFile,
    renameAppFile,
    deleteAppFile,
    shouldRenderMarkdown,
  ]);

  const { mutateAsync: saveSketchFileQuery } = useMutation({
    mutationFn: async (payload?: {
      fileId?: string;
      code?: string;
      hash?: string;
    }) => {
      if (!payload || !payload.fileId || !payload.code) {
        return Promise.reject(new Error('No payload provided'));
      }

      const { fileId: path, code: content } = payload;
      try {
        await saveAppFile(`${appPath}/${path}`, content);
      } catch (error) {
        return Promise.reject(
          new Error(`Failed to save sketch file: ${error}`),
        );
      }
      return null;
    },
  });

  const updateCodeSubjectHash = useCallback(async () => undefined, []);

  const useCreateSketchFromExisting =
    (): ReturnType<UseCreateSketchFromExisting> => ({
      create: async () => undefined,
      isLoading: false,
    });

  const createSketchFromExisting = useCallback(useCreateSketchFromExisting, []);

  const retrieveSketches = useCallback(async () => [], []);

  const { setCode, saveCode } = useCodeChange(
    saveSketchFileQuery,
    selectFile,
    codeInjectionsSubjectNext,
    getCodeSubjectById,
    codeSubjectNext,
    getUnsavedFilesSubject,
    updateCodeSubjectHash,
    createSketchFromExisting,
    retrieveSketches,
    false,
    false,
    readOnly,
    selectedFile,
    selectableMainFile,
    undefined,
    undefined,
    tabs,
    true,
  );

  useCodeEditorViewInstance(selectFile, tabs);

  const onReceiveViewInstance = useCallback(
    (viewInstance: EditorView | null): void => {
      codeEditorViewInstance.instance = viewInstance;
    },
    [],
  );

  const useCodeEditorLogic = (): ReturnType<CodeEditorLogic> => {
    useCodeInjectionsObservable(getCodeInjectionsSubject);

    const blocksOwned = hasSidecar(selectedFile?.fileId);
    const codeReadOnly =
      readOnly || isReadonlyFile(selectedFile) || blocksOwned;

    return {
      setCode,
      sketchDataIsLoading,
      getCode: () =>
        getSelectedCodeObservableValue(getCodeSubjectById, selectedFile?.fileId)
          ?.value,
      getCodeExt: () =>
        getSelectedCodeObservableValue(getCodeSubjectById, selectedFile?.fileId)
          ?.meta.ext,
      getCodeInstanceId: () =>
        getSelectedCodeObservableValue(getCodeSubjectById, selectedFile?.fileId)
          ?.meta.instanceId,
      getCodeLastInjectionLine: (): number | undefined => {
        const value = getSelectedCodeObservableValue(
          getCodeSubjectById,
          selectedFile?.fileId,
        );
        const lineToScroll = value?.meta.lineToScroll;
        if (value) {
          codeInjectionsSubjectNext(
            value.fileId,
            value.value,
            { saveCode },
            false,
            undefined,
          );
        }
        return lineToScroll;
      },
      getFileId: () => selectedFile?.fileId,
      codeInstanceIds: tabs
        .map(
          (t) =>
            getSelectedCodeObservableValue(getCodeSubjectById, t.fileId)?.meta
              .instanceId,
        )
        .filter((id): id is string => Boolean(id)),
      onReceiveViewInstance,
      fontSize: 12,
      readOnly: codeReadOnly,
      showReadOnlyBanner: readOnly || blocksOwned,
      hasHeader: false,
      hasTabs: true,
      useScrollPastEnd: true,
      gutter: { lineNumberStartOffset: 0 },
    };
  };

  const codeEditorLogic = useCallback(useCodeEditorLogic, [
    onReceiveViewInstance,
    readOnly,
    saveCode,
    selectedFile,
    setCode,
    sketchDataIsLoading,
    tabs,
    hasSidecar,
  ]);

  const useSecretsEditorLogic = (): ReturnType<SecretsEditorLogic> => {
    const updateSecrets = useCallback(
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      async (): Promise<void> => {},
      [],
    );

    const openDeleteSecretDialog = useCallback(
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      (): void => {},
      [],
    );

    return {
      secrets: undefined,
      updateSecrets,
      openDeleteSecretDialog,
    };
  };

  const secretsEditorLogic = useCallback(useSecretsEditorLogic, []);

  const openExternalLink = useCallback((url: string) => {
    if (!url) {
      console.warn('No URL provided to open externally');
      return;
    }
    openLinkExternal(url);
  }, []);

  const brickDetailLogic = useMemo(
    () => makeAppBrickDetailLogic(appId),
    [appId],
  );

  const useEditorPanelLogic = (): ReturnType<EditorPanelLogic> => {
    const controlsProps = {
      hideControls: true,
    } as EditorControlsProps;

    return {
      tabsBarLogic,
      codeEditorLogic,
      secretsEditorLogic,
      brickDetailLogic,
      selectedFile: selectedFile
        ? {
            id: selectedFile.fileId,
            ext: selectedFile.fileExtension,
            getData: getDataFromFile(selectedFile, appPath),
          }
        : undefined,
      ...controlsProps,
      isFullscreen: false,
      codeIsFormatting: false,
      isConcurrent: false,
      hideTabs: false,
      shouldRenderMarkdown,
      markdownCanBeRendered: true,
      setShouldRenderMarkdown,
      openExternalLink,
      canSwitchMarkdownMode: !(
        selectedFile?.fileId && unsavedFileIds?.has(selectedFile?.fileId)
      ),
      blocklyEditorLogic,
      codeBlocksTabMode: effectiveTabMode,
      setCodeBlocksTabMode,
      codeBlocksCanBeToggled,
      hasSidecar: hasSidecar(selectedFile?.fileId),
      readOnly,
    };
  };

  const editorPanelLogic = useCallback(useEditorPanelLogic, [
    tabsBarLogic,
    codeEditorLogic,
    secretsEditorLogic,
    brickDetailLogic,
    selectedFile,
    appPath,
    shouldRenderMarkdown,
    openExternalLink,
    unsavedFileIds,
    readOnly,
    blocklyEditorLogic,
    effectiveTabMode,
    setCodeBlocksTabMode,
    codeBlocksCanBeToggled,
    hasSidecar,
  ]);

  return {
    editorPanelLogic,
    blocksOverwriteDialogLogic,
    blocklyPromptDialogLogic,
  };
};
