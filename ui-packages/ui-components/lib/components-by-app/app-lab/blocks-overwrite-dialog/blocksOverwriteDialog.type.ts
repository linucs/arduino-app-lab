export type BlocksOverwriteDialogData = {
  sourceFullName: string;
  sidecarFullName: string;
};

export type BlocksOverwriteDialogLogic = () => BlocksOverwriteDialogData & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  confirmAction: () => void;
};
