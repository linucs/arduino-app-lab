import 'blockly/blocks';

import * as Blockly from 'blockly';
import clsx from 'clsx';
import { useEffect, useRef } from 'react';
import { useDebouncedCallback } from 'use-debounce';

import { getBlockCatalog } from '@cloud-editor-mono/domain/src/services/services-by-app/app-lab';

import { useI18n } from '../i18n/useI18n';
import { snackbar } from '../snackbar';
import { adapterFor, languageToRuntime } from './adapters';
import { CodeFactory } from './code-factory';
import styles from './BlocklyEditor.module.scss';
import {
  BlocklyEditorLogic,
  BlocklyLanguage,
  SIDECAR_FORMAT_VERSION,
} from './blocklyEditor.type';
import { installAppLabContextMenuStyling } from './contextMenuStyling';
import { messages } from './messages';
import { appLabDarkTheme } from './themes/appLabDarkTheme';

interface SidecarEnvelope {
  version: number;
  language: BlocklyLanguage;
  workspace: object;
}

const DEBOUNCE_MS = 1000;

type ParseResult = {
  blocksState: object | undefined;
  unsupportedVersion: boolean;
  errorKind?: 'parse-error' | 'unsupported-version';
};

const parseSidecar = (raw: string | undefined): ParseResult => {
  if (!raw) return { blocksState: undefined, unsupportedVersion: false };
  try {
    const parsed = JSON.parse(raw) as Partial<SidecarEnvelope>;
    if (
      typeof parsed.version === 'number' &&
      parsed.version > SIDECAR_FORMAT_VERSION
    ) {
      return {
        blocksState: undefined,
        unsupportedVersion: true,
        errorKind: 'unsupported-version',
      };
    }
    if (
      parsed &&
      typeof parsed.workspace === 'object' &&
      parsed.workspace !== null
    ) {
      return { blocksState: parsed.workspace, unsupportedVersion: false };
    }
  } catch (_error) {
    return {
      blocksState: undefined,
      unsupportedVersion: false,
      errorKind: 'parse-error',
    };
  }
  return { blocksState: undefined, unsupportedVersion: false };
};

interface BlocklyEditorProps {
  blocklyEditorLogic: BlocklyEditorLogic;
  classes?: { container?: string };
}

const BlocklyEditor: React.FC<BlocklyEditorProps> = (
  props: BlocklyEditorProps,
) => {
  const { blocklyEditorLogic, classes } = props;
  const {
    language,
    initialBlocks,
    onBlocksChange,
    onFirstBlockDrop,
    onPrompt,
    onAlert,
    onConfirm,
    fileId,
    readOnly,
  } = blocklyEditorLogic();
  const { formatMessage } = useI18n();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  // Tracks whether the workspace was loaded with content (sidecar existed).
  const sidecarExistedRef = useRef<boolean>(false);
  // Reentrancy guard while we ask the parent for first-drop confirmation.
  const awaitingConfirmRef = useRef<boolean>(false);
  // The last raw sidecar value successfully applied to the workspace — used to
  // detect when an async-loaded sidecar arrives after the workspace mounted.
  const lastAppliedSidecarRef = useRef<string | undefined>(undefined);
  // Set to true while applySidecar is running so handleChange skips
  // flushChange() without disabling Blockly's global event system (which would
  // prevent the toolbox flyout from updating its state during workspace.clear).
  const isApplyingSidecarRef = useRef<boolean>(false);
  // Dedup the sidecar-error toast across StrictMode's double-mount cycle.
  // `lastFileIdRef` is reset during render (not in an effect) whenever fileId
  // actually changes, so revisiting a file re-asserts the warning, but the
  // setup→cleanup→setup cycle StrictMode runs on initial mount sees an
  // unchanged fileId and reuses the existing `toastedErrorSignatureRef` —
  // suppressing the second toast.
  const lastFileIdRef = useRef<string | undefined>(undefined);
  const toastedErrorSignatureRef = useRef<string | undefined>(undefined);
  const factoryRef = useRef<CodeFactory | null>(null);
  if (lastFileIdRef.current !== fileId) {
    lastFileIdRef.current = fileId;
    toastedErrorSignatureRef.current = undefined;
  }

  const adapter = adapterFor(languageToRuntime(language));

  const flushChange = useDebouncedCallback(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;
    const state = Blockly.serialization.workspaces.save(workspace);
    const envelope: SidecarEnvelope = {
      version: SIDECAR_FORMAT_VERSION,
      language,
      workspace: state,
    };
    const blocksJson = JSON.stringify(envelope, null, 2);
    const factory = factoryRef.current;
    const generatedCode = factory
      ? factory.generateCode(workspace)
      : adapter.generator.workspaceToCode(workspace);
    // Pre-register this payload as the last-applied state so the round-trip
    // (parent saves → updates `initialBlocks` prop → effect compares) skips
    // reloading the workspace, avoiding scroll/selection resets.
    lastAppliedSidecarRef.current = blocksJson;
    onBlocksChange(blocksJson, generatedCode);
  }, DEBOUNCE_MS);

  const applySidecar = (raw: string | undefined): void => {
    const workspace = workspaceRef.current;
    if (!workspace) return;
    const { blocksState, errorKind } = parseSidecar(raw);

    if (errorKind) {
      const signature = `${fileId}:${errorKind}`;
      if (toastedErrorSignatureRef.current !== signature) {
        toastedErrorSignatureRef.current = signature;
        if (errorKind === 'parse-error') {
          snackbar({
            message: formatMessage(messages.sidecarMalformed),
            variant: 'warning',
            opts: { duration: 6000 },
          });
        } else if (errorKind === 'unsupported-version') {
          snackbar({
            message: formatMessage(messages.sidecarUnsupportedVersion),
            variant: 'warning',
            opts: { duration: 6000 },
          });
        }
      }
    }
    // Use an application-level flag instead of Blockly.Events.disable() so
    // that Blockly's internal events still fire (keeping the toolbox flyout in
    // sync) while our handleChange listener skips spurious flushChange() calls.
    isApplyingSidecarRef.current = true;
    try {
      workspace.clear();
      if (blocksState) {
        Blockly.serialization.workspaces.load(blocksState, workspace);
      }
    } catch (error) {
      console.error('BlocklyEditor: failed to load sidecar state', error);
      // Reset to a known-clean empty state after a partial load failure.
      try {
        workspace.clear();
      } catch (_) {
        // ignore secondary clear errors
      }
    } finally {
      isApplyingSidecarRef.current = false;
      // Discard any undo entries created during clear/load so the user starts
      // with a clean undo history relative to the freshly applied state.
      workspace.clearUndo();
    }
    sidecarExistedRef.current = Boolean(raw);
    lastAppliedSidecarRef.current = raw;
  };

  // Mount / remount the workspace whenever the bound file changes.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Pre-parse the sidecar before injecting so Blockly's readOnly UI (no
    // toolbox, no flyout, no drag) is fully initialized from the start.
    // Setting workspace.options.readOnly after inject has no visual effect.
    const { unsupportedVersion } = parseSidecar(initialBlocks);
    const isReadOnly = readOnly === true || unsupportedVersion;

    const workspace = Blockly.inject(container, {
      toolbox: adapter.toolbox,
      readOnly: isReadOnly,
      trashcan: true,
      move: { scrollbars: true, drag: true, wheel: true },
      zoom: { controls: true, wheel: true, startScale: 1.0 },
      theme: appLabDarkTheme,
      renderer: 'thrasos',
      grid: { spacing: 20, length: 1, colour: '#232B2E', snap: true },
    }) as Blockly.WorkspaceSvg;

    // Re-skin Blockly's built-in context-menu items with App Lab icons + the
    // destructive red on Delete actions. Idempotent — guarded by a module
    // flag so additional mounts don't stack wrappers on top of each other.
    installAppLabContextMenuStyling();

    workspaceRef.current = workspace;

    const factory = new CodeFactory(adapter);
    factoryRef.current = factory;
    getBlockCatalog()
      .then((entries) => {
        factory.loadCatalogEntries(entries);
        const catalogCategories = factory.getCatalogToolboxCategories();
        if (catalogCategories.length > 0 && !isReadOnly) {
          const merged: Blockly.utils.toolbox.ToolboxInfo = {
            kind: 'categoryToolbox',
            contents: [
              ...(adapter.toolbox as Blockly.utils.toolbox.ToolboxInfo).contents,
              ...catalogCategories,
            ],
          };
          workspace.updateToolbox(merged);
        }
      })
      .catch((err) => {
        console.warn('[BlocklyEditor] failed to load block catalog:', err);
      });

    lastAppliedSidecarRef.current = undefined;
    applySidecar(initialBlocks);

    const handleChange = async (
      event: Blockly.Events.Abstract,
    ): Promise<void> => {
      if (event.isUiEvent) return;
      if (awaitingConfirmRef.current) return;
      if (isApplyingSidecarRef.current) return;

      // First-block-drop guard: when there is no sidecar yet, surface the
      // confirmation modal before the workspace becomes "owned by blocks".
      // This must run regardless of `workspace.isDragging()` because Blockly
      // fires BLOCK_CREATE while the user is still dragging a block out of the
      // flyout — gating on isDragging here would swallow the only chance to
      // ask before the sidecar/source overwrite kicks in.
      if (
        !sidecarExistedRef.current &&
        onFirstBlockDrop &&
        event.type === Blockly.Events.BLOCK_CREATE
      ) {
        awaitingConfirmRef.current = true;
        try {
          const approved = await onFirstBlockDrop();
          if (!approved) {
            Blockly.Events.disable();
            try {
              workspace.undo(false);
            } finally {
              Blockly.Events.enable();
            }
            return;
          }
          // Mark sidecar as now owning the file so subsequent edits don't
          // re-trigger the dialog.
          sidecarExistedRef.current = true;
        } finally {
          awaitingConfirmRef.current = false;
        }
      }

      if (workspace.isDragging()) return;

      flushChange();
    };

    workspace.addChangeListener(handleChange);

    return () => {
      flushChange.cancel();
      workspace.removeChangeListener(handleChange);
      workspace.dispose();
      workspaceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId]);

  // Reload the workspace when the sidecar content arrives asynchronously
  // (e.g. after a `getAppFileContent` fetch settles for the just-opened file).
  useEffect(() => {
    if (initialBlocks === lastAppliedSidecarRef.current) return;
    applySidecar(initialBlocks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialBlocks]);

  // Register custom dialog handlers so Blockly's built-in `window.prompt`/
  // `alert`/`confirm` calls (used by Create variable, Rename variable, Delete
  // variable, Create function, etc.) work inside Wails webviews, where the
  // native browser dialogs are no-ops. `Blockly.dialog.set*` are global, so
  // we re-register on every change of the supplied async callbacks.
  useEffect(() => {
    if (onPrompt) {
      Blockly.dialog.setPrompt((message, defaultValue, callback) => {
        onPrompt(message, defaultValue).then(callback);
      });
    }
    if (onAlert) {
      Blockly.dialog.setAlert((message, callback) => {
        onAlert(message).then(() => callback?.());
      });
    }
    if (onConfirm) {
      Blockly.dialog.setConfirm((message, callback) => {
        onConfirm(message).then(callback);
      });
    }
  }, [onPrompt, onAlert, onConfirm]);

  // Resize handling — Blockly needs an explicit `svgResize` when the host
  // container size changes (e.g. side panel toggle, fullscreen).
  useEffect(() => {
    const container = containerRef.current;
    const workspace = workspaceRef.current;
    if (!container || !workspace) return;
    const observer = new ResizeObserver(() => {
      Blockly.svgResize(workspace);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={clsx(styles['blockly-editor'], classes?.container)}
    />
  );
};

export default BlocklyEditor;
