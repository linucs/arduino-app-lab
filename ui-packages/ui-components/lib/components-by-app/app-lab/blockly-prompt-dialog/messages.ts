import { defineMessages } from 'react-intl';

export const messages = defineMessages({
  blocklyPromptDialogTitlePrompt: {
    id: 'blocklyPromptDialog.title.prompt',
    defaultMessage: 'Enter a value',
    description:
      'Header title for the Blockly prompt dialog when an input is required (e.g. creating a variable)',
  },
  blocklyPromptDialogTitleAlert: {
    id: 'blocklyPromptDialog.title.alert',
    defaultMessage: 'Notice',
    description: 'Header title for the Blockly alert dialog',
  },
  blocklyPromptDialogTitleConfirm: {
    id: 'blocklyPromptDialog.title.confirm',
    defaultMessage: 'Confirm',
    description:
      'Header title for the Blockly confirm dialog (e.g. delete variable confirmation)',
  },
  blocklyPromptDialogOkButton: {
    id: 'blocklyPromptDialog.okButton',
    defaultMessage: 'OK',
    description:
      'Label for the confirm button in the Blockly prompt / alert / confirm dialog',
  },
  blocklyPromptDialogCancelButton: {
    id: 'blocklyPromptDialog.cancelButton',
    defaultMessage: 'Cancel',
    description:
      'Label for the cancel button in the Blockly prompt and confirm dialogs',
  },
});
