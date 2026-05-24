export type BlocklyDialogKind = 'prompt' | 'alert' | 'confirm';

export type BlocklyPromptDialogData = {
  kind: BlocklyDialogKind;
  message: string;
  inputValue: string;
};

export type BlocklyPromptDialogLogic = () => BlocklyPromptDialogData & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setInputValue: (value: string) => void;
  confirmAction: () => void;
  cancelAction: () => void;
};

export type BlocklyPromptFn = (
  message: string,
  defaultValue: string,
) => Promise<string | null>;
export type BlocklyAlertFn = (message: string) => Promise<void>;
export type BlocklyConfirmFn = (message: string) => Promise<boolean>;
