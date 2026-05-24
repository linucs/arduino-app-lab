export type TypedVariableDialogLogic = () => {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  types: [string, string][];
  confirmAction: (name: string, type: string) => void;
};
