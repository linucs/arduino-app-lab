import { useEffect, useState } from 'react';

import {
  Button,
  ButtonVariant,
} from '../../../components-by-app/app-lab';
import { Input } from '../../../essential/input/Input';
import { InputStyle } from '../../../essential/input/input.type';
import { AppLabDialog } from '../app-lab-dialog/AppLabDialog';
import { TypedVariableDialogLogic } from './typedVariableDialog.type';
import styles from './typed-variable-dialog.module.scss';

interface TypedVariableDialogProps {
  logic: TypedVariableDialogLogic;
}

export const TypedVariableDialog: React.FC<TypedVariableDialogProps> = ({
  logic,
}: TypedVariableDialogProps) => {
  const { open, onOpenChange, types, confirmAction } = logic();
  const [varName, setVarName] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');

  useEffect(() => {
    if (open) {
      setVarName('');
      setSelectedType(types[0]?.[1] ?? '');
    }
  }, [open, types]);

  const handleSubmit = (): void => {
    if (varName.trim()) {
      confirmAction(varName.trim(), selectedType);
    }
  };

  return (
    <AppLabDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create Variable"
      onSubmit={handleSubmit}
      classes={{ body: styles['dialog-body'] }}
      footer={
        <>
          <Button
            variant={ButtonVariant.Secondary}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button variant={ButtonVariant.Primary} type="submit">
            Create
          </Button>
        </>
      }
    >
      {open && (
        <>
          <div className={styles['field']}>
            <label className={styles['label']} htmlFor="typed-var-name">
              Variable name
            </label>
            <Input
              inputStyle={InputStyle.AppLab}
              value={varName}
              onChange={setVarName}
              onEnter={handleSubmit}
              placeholder="e.g. myVariable"
              autoFocus
            />
          </div>
          <div className={styles['field']}>
            <span className={styles['label']}>Type</span>
            <div className={styles['types']}>
              {types.map(([label, type]) => (
                <label key={type} className={styles['type-option']}>
                  <input
                    type="radio"
                    name="typed-var-type"
                    value={type}
                    checked={selectedType === type}
                    onChange={() => setSelectedType(type)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </AppLabDialog>
  );
};
