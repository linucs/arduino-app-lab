import { Button, ButtonAppearance, ButtonVariant } from '../../../components-by-app/app-lab';
import { AppLabDialog } from '../../../dialogs/app-lab/app-lab-dialog/AppLabDialog';
import { useI18n } from '../../../i18n/useI18n';
import { Small, XSmall } from '../../../typography';
import { BlocksOverwriteDialogLogic } from './blocksOverwriteDialog.type';
import { messages } from './messages';

interface BlocksOverwriteDialogProps {
  blocksOverwriteDialogLogic: BlocksOverwriteDialogLogic;
}

const BlocksOverwriteDialog: React.FC<BlocksOverwriteDialogProps> = ({
  blocksOverwriteDialogLogic,
}: BlocksOverwriteDialogProps) => {
  const { open, onOpenChange, confirmAction, sourceFullName, sidecarFullName } =
    blocksOverwriteDialogLogic();
  const { formatMessage } = useI18n();

  return (
    <AppLabDialog
      open={open}
      onOpenChange={onOpenChange}
      title={formatMessage(messages.blocksOverwriteDialogTitle)}
      footer={
        <>
          <Button
            variant={ButtonVariant.Secondary}
            onClick={() => onOpenChange(false)}
          >
            {formatMessage(messages.blocksOverwriteDialogCancelButton)}
          </Button>
          <Button
            variant={ButtonVariant.Secondary}
            appearance={ButtonAppearance.Destructive}
            onClick={confirmAction}
          >
            {formatMessage(messages.blocksOverwriteDialogConfirmButton)}
          </Button>
        </>
      }
    >
      {open && (
        <>
          <XSmall bold>
            {formatMessage(messages.blocksOverwriteDialogHeader, {
              sourceFullName,
            })}
          </XSmall>
          <Small>
            {formatMessage(messages.blocksOverwriteDialogMessage, {
              sourceFullName,
              sidecarFullName,
            })}
          </Small>
        </>
      )}
    </AppLabDialog>
  );
};

export default BlocksOverwriteDialog;
