import * as Blockly from 'blockly';

type Preset = [string, string];

class FieldCombobox extends Blockly.Field<string> {
  override SERIALIZABLE = true;
  override EDITABLE = true;

  private presets_: Preset[];

  constructor(
    presets: Preset[],
    value?: string,
    validator?: Blockly.FieldValidator<string>,
  ) {
    super(value ?? presets[0]?.[1] ?? '', validator);
    this.presets_ = presets;
  }

  static override fromJson(
    options: Record<string, unknown>,
  ): FieldCombobox {
    const presets = (options['options'] as Preset[]) ?? [];
    const value = options['text'] as string | undefined;
    return new FieldCombobox(presets, value);
  }

  protected override doClassValidation_(value?: string): string | null {
    if (value === undefined || value === null) return '';
    return String(value);
  }

  protected override getDisplayText_(): string {
    const val = this.getValue();
    for (const [label, v] of this.presets_) {
      if (v === val) return `${label} ▾`;
    }
    return `${val || ''} ▾`;
  }

  override getText(): string {
    const val = this.getValue();
    for (const [label, v] of this.presets_) {
      if (v === val) return label;
    }
    return val || '';
  }

  protected override showEditor_(): void {
    const contentDiv = Blockly.DropDownDiv.getContentDiv();
    contentDiv.innerHTML = '';
    contentDiv.style.maxHeight = '300px';
    contentDiv.style.overflowY = 'auto';

    const currentValue = this.getValue();
    const isPreset = this.presets_.some(([, v]) => v === currentValue);

    for (const [label, value] of this.presets_) {
      const opt = document.createElement('div');
      const selected = value === currentValue;
      opt.style.cssText =
        'padding:6px 12px;cursor:pointer;white-space:nowrap;' +
        'font-size:13px;font-family:sans-serif;color:#fff;' +
        (selected ? 'background:rgba(255,255,255,0.15);font-weight:600;' : '');
      opt.textContent = label;
      opt.addEventListener('mouseenter', () => {
        if (!selected) opt.style.background = 'rgba(255,255,255,0.1)';
      });
      opt.addEventListener('mouseleave', () => {
        opt.style.background = selected ? 'rgba(255,255,255,0.15)' : '';
      });
      opt.addEventListener('click', () => {
        this.setValue(value);
        Blockly.DropDownDiv.hideIfOwner(this);
      });
      contentDiv.appendChild(opt);
    }

    const sep = document.createElement('div');
    sep.style.cssText = 'height:1px;background:rgba(255,255,255,0.2);margin:4px 0;';
    contentDiv.appendChild(sep);

    const inputRow = document.createElement('div');
    inputRow.style.cssText = 'padding:4px 8px 6px;';
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Custom type…';
    input.style.cssText =
      'width:100%;box-sizing:border-box;padding:4px 6px;' +
      'font-size:13px;font-family:sans-serif;' +
      'border:1px solid rgba(255,255,255,0.3);border-radius:3px;' +
      'background:rgba(0,0,0,0.3);color:#fff;outline:none;';

    if (!isPreset && currentValue) {
      input.value = currentValue;
    }

    input.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const trimmed = input.value.trim();
        if (trimmed) this.setValue(trimmed);
        Blockly.DropDownDiv.hideIfOwner(this);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        Blockly.DropDownDiv.hideIfOwner(this);
      }
      e.stopPropagation();
    });

    inputRow.appendChild(input);
    contentDiv.appendChild(inputRow);

    Blockly.DropDownDiv.showPositionedByField(this, () => {
      contentDiv.innerHTML = '';
    });

    if (!isPreset) {
      input.focus();
      input.select();
    }
  }
}

Blockly.fieldRegistry.register('field_combobox', FieldCombobox);
