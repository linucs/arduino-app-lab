import clsx from 'clsx';
import { memo, Suspense } from 'react';

import { LazyBlocklyEditor } from '../blockly-editor';
import { CodeEditor } from '../code-editor';
import { KeywordMap } from '../code-mirror';
import { BrickDetail, MarkdownReader } from '../components-by-app/app-lab';
import EditorControls from '../editor-controls/EditorControls';
import EditorImage from '../editor-image/EditorImage';
import { EditorStatus } from '../editor-status';
import { EditorTabsBar, SUPPORTED_IMAGE_TYPES } from '../editor-tabs-bar';
import EditorToolbar from '../editor-toolbar/EditorToolbar';
import { SecretsEditor } from '../secrets-editor';
import { Skeleton } from '../skeleton';
import styles from './editor-panel.module.scss';
import { EditorPanelLogic } from './editorPanel.type';
import { editorsNotification } from './EditorPanelSpec';

const CODE_BLOCKS_TOGGLEABLE_EXTS = new Set(['ino', 'cpp', 'py']);
const isCodeBlocksToggleableExt = (ext?: string): boolean =>
  ext ? CODE_BLOCKS_TOGGLEABLE_EXTS.has(ext) : false;

interface EditorPanelProps {
  editorPanelLogic: EditorPanelLogic;
  getKeywords: () => KeywordMap | undefined;
  readOnlyBanner?: JSX.Element;
  onCopyCode?: () => void;
  classes?: {
    container?: string;
    tabsBar?: string;
    selectedTab?: string;
    tab?: string;
    editorImage?: string;
    editorCode?: string;
  };
}

const EditorPanel: React.FC<EditorPanelProps> = (props: EditorPanelProps) => {
  const { editorPanelLogic, classes, getKeywords, readOnlyBanner, onCopyCode } =
    props;
  const {
    brickDetailLogic,
    codeEditorLogic,
    secretsEditorLogic,
    tabsBarLogic,
    selectedFile,
    isFullscreen,
    codeIsFormatting,
    isConcurrent,
    hideTabs,
    openExternalLink,
    shouldRenderMarkdown,
    setShouldRenderMarkdown,
    markdownCanBeRendered,
    canSwitchMarkdownMode,
    blocklyEditorLogic,
    codeBlocksTabMode,
    setCodeBlocksTabMode,
    codeBlocksCanBeToggled,
    readOnly,
    ...rest
  } = editorPanelLogic();

  const codeBlocksToggleable = isCodeBlocksToggleableExt(selectedFile?.ext);
  const showBlocksEditor =
    codeBlocksToggleable &&
    codeBlocksTabMode === 'blocks' &&
    blocklyEditorLogic !== undefined;

  const renderContent = (): JSX.Element => {
    if (selectedFile && selectedFile.ext === 'md' && shouldRenderMarkdown) {
      return (
        <div className={styles['markdown-container']}>
          <MarkdownReader
            key={selectedFile.id}
            content={selectedFile.getData()}
            onOpenExternalLink={openExternalLink}
            onCopyCode={onCopyCode}
          />
        </div>
      );
    }

    if (
      selectedFile &&
      SUPPORTED_IMAGE_TYPES.includes(`.${selectedFile.ext}`)
    ) {
      return (
        <EditorImage
          key={selectedFile.id}
          data={selectedFile.getData()}
          classes={{ container: classes?.editorImage }}
          extension={
            selectedFile.ext === 'svg'
              ? `${selectedFile.ext}+xml`
              : selectedFile.ext
          }
        />
      );
    }

    if (selectedFile && selectedFile.ext === 'secrets') {
      return (
        <SecretsEditor secretsEditorLogic={secretsEditorLogic}></SecretsEditor>
      );
    }

    if (selectedFile && selectedFile.ext === 'brick' && brickDetailLogic) {
      return (
        <div className={styles['brick-container']}>
          <BrickDetail
            brickId={selectedFile.id}
            brickDetailLogic={brickDetailLogic}
          />
        </div>
      );
    }

    if (showBlocksEditor && blocklyEditorLogic) {
      return (
        <Suspense
          fallback={
            <div className={clsx(classes?.editorCode)}>
              <Skeleton variant="rounded" count={6} />
            </div>
          }
        >
          <LazyBlocklyEditor
            blocklyEditorLogic={blocklyEditorLogic}
            classes={{ container: classes?.editorCode }}
          />
        </Suspense>
      );
    }

    return (
      <CodeEditor
        classes={{ container: classes?.editorCode }}
        codeEditorLogic={codeEditorLogic}
        getKeywords={getKeywords}
        readOnlyBanner={readOnlyBanner}
      />
    );
  };

  return (
    <EditorStatus
      className={clsx(styles['editor-panel'], classes?.container)}
      editorStatus={isConcurrent ? editorsNotification : undefined}
    >
      {!hideTabs && (
        <EditorTabsBar
          tabsBarLogic={tabsBarLogic}
          classes={{
            container: classes?.tabsBar,
            selected: classes?.selectedTab,
            tab: classes?.tab,
          }}
        />
      )}
      <div className={styles['editor-content']}>
        {selectedFile?.ext === 'md' && markdownCanBeRendered && (
          <EditorToolbar
            type="markdown"
            isRendered={!!shouldRenderMarkdown}
            readOnly={readOnly}
            classes={{
              container: styles['editor-toolbar-container'],
              disabled: !canSwitchMarkdownMode
                ? styles['editor-toolbar-disabled']
                : undefined,
            }}
            onToggleRender={
              canSwitchMarkdownMode ? setShouldRenderMarkdown : undefined
            }
          />
        )}
        {codeBlocksToggleable && codeBlocksTabMode && (
          <EditorToolbar
            type="codeBlocks"
            activeMode={codeBlocksTabMode}
            onChangeMode={
              codeBlocksCanBeToggled ? setCodeBlocksTabMode : undefined
            }
            readOnly={readOnly}
            classes={{
              container: styles['editor-toolbar-container'],
              disabled:
                codeBlocksCanBeToggled === false
                  ? styles['editor-toolbar-disabled']
                  : undefined,
            }}
          />
        )}
        {renderContent()}
        {!rest.hideControls && (
          <EditorControls
            handlers={rest.editorControlsHandlers}
            isFullscreen={isFullscreen}
            indenting={codeIsFormatting}
          />
        )}
      </div>
    </EditorStatus>
  );
};

export default memo(EditorPanel);
