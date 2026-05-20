import { useEffect, useRef } from 'react';

import { Button, ButtonType } from '../../../essential/button';
import { GenericDialog } from '../../../essential/generic-dialog';
import { Input } from '../../../essential/input';
import { useI18n } from '../../../i18n/useI18n';
import { Small, Text } from '../../../typography';
import { BlocklyPromptDialogLogic } from './blocklyPromptDialog.type';
import { messages } from './messages';

interface BlocklyPromptDialogProps {
  themeClass?: string;
  blocklyPromptDialogLogic: BlocklyPromptDialogLogic;
}

const BlocklyPromptDialog: React.FC<BlocklyPromptDialogProps> = (
  props: BlocklyPromptDialogProps,
) => {
  const { themeClass, blocklyPromptDialogLogic } = props;
  const {
    kind,
    message,
    inputValue,
    setInputValue,
    reactModalProps,
    setIsOpen,
    confirmAction,
    cancelAction,
  } = blocklyPromptDialogLogic();

  const { formatMessage } = useI18n();
  const dialogRef = useRef<HTMLDivElement>(null);

  // Autofocus the input when a prompt dialog opens. `autoFocus`/`autoSelect` on
  // Input only fire on mount; the modal portal isn't visible at that moment, so
  // we re-apply focus here when isOpen flips.
  useEffect(() => {
    if (kind !== 'prompt') return;
    if (!reactModalProps.isOpen) return;
    const handle = window.requestAnimationFrame(() => {
      const el = dialogRef.current?.querySelector('input');
      if (el instanceof HTMLInputElement) {
        el.focus();
        el.select();
      }
    });
    return () => window.cancelAnimationFrame(handle);
  }, [kind, reactModalProps.isOpen]);

  const headerTitle = formatMessage(
    kind === 'prompt'
      ? messages.blocklyPromptDialogTitlePrompt
      : kind === 'confirm'
        ? messages.blocklyPromptDialogTitleConfirm
        : messages.blocklyPromptDialogTitleAlert,
  );

  return (
    <GenericDialog
      dialogRef={dialogRef}
      reactModalProps={reactModalProps}
      themeClass={themeClass}
      setIsOpen={setIsOpen}
    >
      <>
        <GenericDialog.Header
          title={headerTitle}
          onClickClose={cancelAction}
        ></GenericDialog.Header>
        <GenericDialog.Body>
          <>
            <Text>{message}</Text>
            {kind === 'prompt' && (
              <Input
                value={inputValue}
                onChange={(value): void => setInputValue(value)}
                onEnter={confirmAction}
                autoFocus
                autoSelect
              />
            )}
          </>
        </GenericDialog.Body>
        <GenericDialog.Actions>
          <>
            {kind !== 'alert' && (
              <Button type={ButtonType.Tertiary} onClick={cancelAction}>
                <Small uppercase bold>
                  {formatMessage(messages.blocklyPromptDialogCancelButton)}
                </Small>
              </Button>
            )}
            <Button type={ButtonType.Primary} onClick={confirmAction}>
              <Small uppercase bold>
                {formatMessage(messages.blocklyPromptDialogOkButton)}
              </Small>
            </Button>
          </>
        </GenericDialog.Actions>
      </>
    </GenericDialog>
  );
};

export default BlocklyPromptDialog;
