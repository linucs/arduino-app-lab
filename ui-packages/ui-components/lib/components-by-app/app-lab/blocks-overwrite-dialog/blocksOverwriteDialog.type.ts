import { ConfirmActionDialogLogic } from '../../../essential/confirm-action-dialog';

export type BlocksOverwriteDialogData = {
  sourceFullName: string;
  sidecarFullName: string;
};

export type BlocksOverwriteDialogLogic =
  () => ReturnType<ConfirmActionDialogLogic> & BlocksOverwriteDialogData;
