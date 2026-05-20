import { defineMessages } from 'react-intl';

export const messages = defineMessages({
  blocksOverwriteDialogTitle: {
    id: 'blocksOverwriteDialog.title',
    defaultMessage: 'Switch to blocks?',
    description:
      'Title of the dialog shown before creating a blocks sidecar over an existing source file',
  },
  blocksOverwriteDialogHeader: {
    id: 'blocksOverwriteDialog.header',
    defaultMessage: 'Switch {sourceFullName} to blocks',
    description: 'Header text in the blocks overwrite dialog',
  },
  blocksOverwriteDialogMessage: {
    id: 'blocksOverwriteDialog.message',
    defaultMessage:
      'A new file {sidecarFullName} will be created and {sourceFullName} will be overwritten with code generated from the blocks. Until you delete {sidecarFullName}, {sourceFullName} can only be edited through the Blocks view.',
    description:
      'Body text of the blocks overwrite confirmation dialog explaining the side effects',
  },
  blocksOverwriteDialogCancelButton: {
    id: 'blocksOverwriteDialog.cancelButton',
    defaultMessage: 'Cancel',
    description: 'Label for the cancel button in the blocks overwrite dialog',
  },
  blocksOverwriteDialogConfirmButton: {
    id: 'blocksOverwriteDialog.confirmButton',
    defaultMessage: 'Yes, switch to blocks',
    description: 'Label for the confirm button in the blocks overwrite dialog',
  },
});
