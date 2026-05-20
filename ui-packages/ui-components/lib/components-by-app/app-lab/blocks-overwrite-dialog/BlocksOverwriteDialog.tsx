import { ConfirmActionDialog } from '../../../essential/confirm-action-dialog';
import { useI18n } from '../../../i18n/useI18n';
import { Small } from '../../../typography';
import { BlocksOverwriteDialogLogic } from './blocksOverwriteDialog.type';
import { messages } from './messages';

interface BlocksOverwriteDialogProps {
  themeClass?: string;
  blocksOverwriteDialogLogic: BlocksOverwriteDialogLogic;
}

const BlocksOverwriteDialog: React.FC<BlocksOverwriteDialogProps> = (
  props: BlocksOverwriteDialogProps,
) => {
  const { themeClass, blocksOverwriteDialogLogic } = props;
  const { sourceFullName, sidecarFullName } = blocksOverwriteDialogLogic();

  const { formatMessage } = useI18n();

  return (
    <ConfirmActionDialog
      headerTitle={formatMessage(messages.blocksOverwriteDialogTitle)}
      dialogTitle={formatMessage(messages.blocksOverwriteDialogHeader, {
        sourceFullName,
      })}
      dialogMessage={
        <Small>
          {formatMessage(messages.blocksOverwriteDialogMessage, {
            sourceFullName,
            sidecarFullName,
          })}
        </Small>
      }
      dialogCancelButtonLabel={
        <Small uppercase bold>
          {formatMessage(messages.blocksOverwriteDialogCancelButton)}
        </Small>
      }
      dialogConfirmButtonLabel={
        <Small uppercase bold>
          {formatMessage(messages.blocksOverwriteDialogConfirmButton)}
        </Small>
      }
      confirmActionDialogLogic={blocksOverwriteDialogLogic}
      themeClass={themeClass}
    />
  );
};

export default BlocksOverwriteDialog;
