import clsx from 'clsx';

import styles from './editor-toolbar.module.scss';
import CodeBlocksEditorToolbar, {
  CodeBlocksTabMode,
} from './editor-toolbars/CodeBlocksEditorToolbar';
import MarkdownEditorToolbar from './editor-toolbars/MarkdownEditorToolbar';

const EditorToolbarType = ['markdown', 'code', 'codeBlocks'] as const;

type EditorToolbarProps = (
  | {
      type: typeof EditorToolbarType[0];
      isRendered: boolean;
      onToggleRender?: (rendered: boolean) => void;
      readOnly?: boolean;
    }
  | {
      type: typeof EditorToolbarType[1];
    }
  | {
      type: typeof EditorToolbarType[2];
      activeMode: CodeBlocksTabMode;
      onChangeMode?: (mode: CodeBlocksTabMode) => void;
      readOnly?: boolean;
    }
) & {
  classes?: { container?: string; disabled?: string };
};

const EditorToolbar: React.FC<EditorToolbarProps> = (
  props: EditorToolbarProps,
) => {
  const { classes } = props;

  const renderToolbar = (): JSX.Element => {
    switch (props.type) {
      case 'markdown':
        return (
          <MarkdownEditorToolbar
            isRendered={props.isRendered}
            onToggleRender={props.onToggleRender}
            readOnly={props.readOnly}
          />
        );
      case 'codeBlocks':
        return (
          <CodeBlocksEditorToolbar
            activeMode={props.activeMode}
            onChangeMode={props.onChangeMode}
            readOnly={props.readOnly}
          />
        );
      default:
        return <></>;
    }
  };

  return (
    <div
      className={clsx(
        styles['editor-toolbar'],
        classes?.container,
        classes?.disabled,
      )}
    >
      {renderToolbar()}
    </div>
  );
};

export default EditorToolbar;
