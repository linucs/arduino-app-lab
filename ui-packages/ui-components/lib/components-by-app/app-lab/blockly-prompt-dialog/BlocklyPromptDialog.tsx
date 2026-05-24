import {
  Button,
  ButtonVariant,
} from '../../../components-by-app/app-lab';
import { Input } from '../../../essential/input/Input';
import { InputStyle } from '../../../essential/input/input.type';
import { AppLabDialog } from '../../../dialogs/app-lab/app-lab-dialog/AppLabDialog';
import { useI18n } from '../../../i18n/useI18n';
import { BlocklyPromptDialogLogic } from './blocklyPromptDialog.type';
import { messages } from './messages';
import styles from './blockly-prompt-dialog.module.scss';

interface BlocklyPromptDialogProps {
  blocklyPromptDialogLogic: BlocklyPromptDialogLogic;
}

const BlocklyPromptDialog: React.FC<BlocklyPromptDialogProps> = (
  props: BlocklyPromptDialogProps,
) => {
  const { blocklyPromptDialogLogic } = props;
  const { kind, message, inputValue, setInputValue, open, onOpenChange, confirmAction, cancelAction } =
    blocklyPromptDialogLogic();

  const { formatMessage } = useI18n();

  const title = formatMessage(
    kind === 'prompt'
      ? messages.blocklyPromptDialogTitlePrompt
      : kind === 'confirm'
        ? messages.blocklyPromptDialogTitleConfirm
        : messages.blocklyPromptDialogTitleAlert,
  );

  return (
    <AppLabDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      onSubmit={confirmAction}
      classes={{ body: styles['dialog-body'] }}
      footer={
        <>
          {kind !== 'alert' && (
            <Button variant={ButtonVariant.Secondary} onClick={cancelAction}>
              {formatMessage(messages.blocklyPromptDialogCancelButton)}
            </Button>
          )}
          <Button variant={ButtonVariant.Primary} type="submit">
            {formatMessage(messages.blocklyPromptDialogOkButton)}
          </Button>
        </>
      }
    >
      {open && (
        <>
          <p className={styles['message']}>{message}</p>
          {kind === 'prompt' && (
            <Input
              inputStyle={InputStyle.AppLab}
              value={inputValue}
              onChange={setInputValue}
              onEnter={confirmAction}
              autoFocus
            />
          )}
        </>
      )}
    </AppLabDialog>
  );
};

export default BlocklyPromptDialog;
