import {
  ArduinoLoop,
  InfoIconOutline,
} from '@cloud-editor-mono/images/assets/icons';
import {
  BlocklyPromptDialog,
  BlocksOverwriteDialog,
  EditorPanel,
  useI18n,
} from '@cloud-editor-mono/ui-components/lib/components-by-app/app-lab';
import { TypedVariableDialog } from '../../../dialogs/app-lab/typed-variable-dialog/TypedVariableDialog';
import clsx from 'clsx';
import { memo, useCallback } from 'react';

import styles from './app-lab-editor-panel.module.scss';
import { AppLabEditorPanelLogic } from './appLabEditorPanel.type';
import { messages } from './messages';

const BLOCKS_SIDECAR_SUFFIX = '.blocks';

interface AppLabEditorPanelProps {
  appLabEditorLogic: AppLabEditorPanelLogic;
}

const AppLabEditorPanel: React.FC<AppLabEditorPanelProps> = (
  props: AppLabEditorPanelProps,
) => {
  const { appLabEditorLogic } = props;

  const {
    openFiles,
    readOnly,
    editorPanelLogic,
    onCopyCode,
    getKeywords,
    blocksOverwriteDialogLogic,
    blocklyPromptDialogLogic,
    typedVariableDialogLogic,
    selectedFileFullName,
    hasSidecar,
  } = appLabEditorLogic();

  const { formatMessage } = useI18n();

  const getReadOnlyBanner = useCallback((): JSX.Element => {
    if (hasSidecar && selectedFileFullName) {
      return (
        <div className={styles['editor-read-only-banner']}>
          <InfoIconOutline />
          <span>
            {formatMessage(messages.readOnlyBannerBlocksOwned, {
              sidecarFullName: `${selectedFileFullName}${BLOCKS_SIDECAR_SUFFIX}`,
            })}
          </span>
        </div>
      );
    }
    return (
      <div className={styles['editor-read-only-banner']}>
        <InfoIconOutline />
        <span>{formatMessage(messages.readOnlyBanner)}</span>
      </div>
    );
  }, [formatMessage, hasSidecar, selectedFileFullName]);

  return openFiles.length > 0 ? (
    <>
      <EditorPanel
        editorPanelLogic={editorPanelLogic}
        getKeywords={getKeywords}
        onCopyCode={onCopyCode}
        classes={{
          tabsBar: styles['editor-tabs-bar'],
          selectedTab: styles['editor-selected-tab'],
          tab: styles['editor-tab'],
          editorImage: clsx(styles['editor-image'], styles['editor-readonly']),
          editorCode: clsx(
            styles['editor-code'],
            readOnly && styles['editor-readonly'],
          ),
        }}
        readOnlyBanner={getReadOnlyBanner()}
      />
      {blocksOverwriteDialogLogic?.().open && (
        <BlocksOverwriteDialog
          blocksOverwriteDialogLogic={blocksOverwriteDialogLogic}
        />
      )}
      {blocklyPromptDialogLogic?.().open && (
        <BlocklyPromptDialog
          blocklyPromptDialogLogic={blocklyPromptDialogLogic}
        />
      )}
      {typedVariableDialogLogic?.().open && (
        <TypedVariableDialog logic={typedVariableDialogLogic} />
      )}
    </>
  ) : (
    <div className={styles['editor-empty-state']}>
      <ArduinoLoop />
    </div>
  );
};

export default memo(AppLabEditorPanel);
