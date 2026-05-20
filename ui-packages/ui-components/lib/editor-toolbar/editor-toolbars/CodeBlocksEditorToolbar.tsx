import { useCallback } from 'react';

import { Tabs } from '../../components-by-app/app-lab';

export type CodeBlocksTabMode = 'code' | 'blocks';

const tabs = ['Code', 'Blocks'] as const;
type TabLabel = typeof tabs[number];

const modeToLabel = (mode: CodeBlocksTabMode): TabLabel =>
  mode === 'blocks' ? 'Blocks' : 'Code';

const labelToMode = (label: TabLabel): CodeBlocksTabMode =>
  label === 'Blocks' ? 'blocks' : 'code';

interface CodeBlocksEditorToolbarProps {
  activeMode: CodeBlocksTabMode;
  onChangeMode?: (mode: CodeBlocksTabMode) => void;
  readOnly?: boolean;
}

// Controlled toolbar — parent owns the active tab so it can persist per-file.
const CodeBlocksEditorToolbar: React.FC<CodeBlocksEditorToolbarProps> = (
  props: CodeBlocksEditorToolbarProps,
) => {
  const { activeMode, onChangeMode, readOnly } = props;

  const setTab = useCallback(
    (tab: TabLabel): void => {
      onChangeMode?.(labelToMode(tab));
    },
    [onChangeMode],
  );

  const tabsLogic = useCallback(
    () => ({
      tabs,
      setTab,
      activeTab: modeToLabel(activeMode),
    }),
    [activeMode, setTab],
  );

  return <div>{!readOnly && <Tabs tabsLogic={tabsLogic} />}</div>;
};

export default CodeBlocksEditorToolbar;
