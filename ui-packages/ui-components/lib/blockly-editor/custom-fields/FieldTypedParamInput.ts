import * as Blockly from 'blockly';

type Preset = [string, string];

const SEP = '|';

/**
 * Single composite field that owns a **typed C++ parameter** — type selector
 * and parameter name fused into one Blockly Field. The serialized value
 * has the form `"type|name"`.
 *
 * YAML usage:
 *   - type: field_typed_param_input
 *     name: PARAM
 *     text: "args"
 *     defaultType: "String"
 *     options:
 *       - ["String", "String"]
 *       - ["int", "int"]
 *       - ...
 *
 * Template usage:
 *   {{PARAM.type}} → the C++ type token (e.g. "int")
 *   {{PARAM.name}} → the sanitised variable name (via getVariableName())
 *   {{PARAM}}      → same as {{PARAM.name}}
 *
 * Lifecycle mirrors FieldParamInput: a typed workspace variable is created
 * on initModel(), kept in sync with name/type edits via doValueUpdate_(),
 * and GC'd on dispose() if no other field or block references it.
 */
export class FieldTypedParamInput extends Blockly.Field<string> {
  override SERIALIZABLE = true;
  override EDITABLE = true;

  private presets_: Preset[];
  private varId_: string | null = null;

  constructor(
    presets: Preset[],
    initial?: string,
    validator?: Blockly.FieldValidator<string>,
  ) {
    super(initial ?? '', validator);
    this.presets_ = presets;
  }

  static override fromJson(options: Record<string, unknown>): FieldTypedParamInput {
    const presets = (options['options'] as Preset[]) ?? [];
    const defaultName = (options['text'] as string | undefined) ?? 'param';
    const defaultType =
      (options['defaultType'] as string | undefined) ??
      presets[0]?.[1] ??
      'int';
    return new FieldTypedParamInput(presets, `${defaultType}${SEP}${defaultName}`);
  }

  protected override doClassValidation_(value?: string): string | null {
    if (!value) return '';
    return String(value);
  }

  // ---- Parsed pieces ----

  getParamType(): string {
    const raw = this.getValue() || '';
    const idx = raw.indexOf(SEP);
    return idx < 0 ? raw : raw.slice(0, idx);
  }

  getParamName(): string {
    const raw = this.getValue() || '';
    const idx = raw.indexOf(SEP);
    return idx < 0 ? '' : raw.slice(idx + 1);
  }

  getVarId(): string | null {
    return this.varId_;
  }

  // ---- Rendering ----

  protected override getDisplayText_(): string {
    return `${this.getParamType()} ${this.getParamName()} ▾`;
  }

  override getText(): string {
    return `${this.getParamType()} ${this.getParamName()}`;
  }

  // ---- Lifecycle ----

  override initModel(): void {
    const block = this.getSourceBlock();
    if (!block || this.varId_) return;
    // Flyout blocks are previews — skip variable creation. Every category
    // click re-instantiates the flyout's blocks, and each VarCreate fires
    // workspace change events; with the variable map effectively shared with
    // the target workspace, this snowballs into a perceptible UI freeze.
    if ((block as Blockly.BlockSvg).isInFlyout) return;
    const name = this.getParamName() || 'param';
    const type = this.getParamType();
    const varMap = block.workspace.getVariableMap();
    const existing = varMap.getVariable(name, type);
    this.varId_ = existing
      ? existing.getId()
      : varMap.createVariable(name, type).getId();
  }

  override dispose(): void {
    this.deleteVar_();
    super.dispose();
  }

  protected override doValueUpdate_(newValue: string): void {
    super.doValueUpdate_(newValue);
    if (!this.varId_) return;
    const block = this.getSourceBlock();
    if (!block) return;
    const varMap = block.workspace.getVariableMap();
    const v = varMap.getVariableById(this.varId_);
    if (!v) return;

    const newName = this.parseName_(newValue) || 'param';
    const newType = this.parseType_(newValue);

    if (v.getName() !== newName) {
      varMap.renameVariable(v, newName);
    }
    if (v.getType() !== newType) {
      this.migrateVariableType_(block.workspace, this.varId_, newName, newType);
    }
  }

  // ---- Helpers ----

  private parseType_(value: string): string {
    const idx = (value || '').indexOf(SEP);
    return idx < 0 ? (value || '') : value.slice(0, idx);
  }

  private parseName_(value: string): string {
    const idx = (value || '').indexOf(SEP);
    return idx < 0 ? '' : value.slice(idx + 1);
  }

  private migrateVariableType_(
    workspace: Blockly.Workspace,
    oldVarId: string,
    name: string,
    newType: string,
  ): void {
    const varMap = workspace.getVariableMap();
    const oldVar = varMap.getVariableById(oldVarId);
    if (!oldVar) return;

    const uses = Blockly.Variables.getVariableUsesById(workspace, oldVarId);
    const newVar = varMap.createVariable(name, newType);

    for (const useBlock of uses) {
      for (const input of useBlock.inputList) {
        for (const field of input.fieldRow) {
          if (
            field instanceof Blockly.FieldVariable &&
            field.getValue() === oldVarId
          ) {
            field.setValue(newVar.getId());
          }
        }
      }
    }

    if (Blockly.Variables.getVariableUsesById(workspace, oldVarId).length === 0) {
      varMap.deleteVariable(oldVar);
    }

    this.varId_ = newVar.getId();
  }

  private deleteVar_(): void {
    if (!this.varId_) return;
    const block = this.getSourceBlock();
    if (!block) return;
    if (this.countSiblingFieldRefs_(block.workspace) > 0) {
      this.varId_ = null;
      return;
    }
    const varMap = block.workspace.getVariableMap();
    const v = varMap.getVariableById(this.varId_);
    if (v && Blockly.Variables.getVariableUsesById(block.workspace, this.varId_).length === 0) {
      varMap.deleteVariable(v);
    }
    this.varId_ = null;
  }

  private countSiblingFieldRefs_(workspace: Blockly.Workspace): number {
    let count = 0;
    for (const block of workspace.getAllBlocks(false)) {
      for (const input of block.inputList) {
        for (const field of input.fieldRow) {
          if (
            field !== this &&
            field instanceof FieldTypedParamInput &&
            field.getVarId() === this.varId_
          ) {
            count++;
          }
        }
      }
    }
    return count;
  }

  // ---- Editor ----

  protected override showEditor_(): void {
    const contentDiv = Blockly.DropDownDiv.getContentDiv();
    contentDiv.innerHTML = '';
    contentDiv.style.maxWidth = '280px';

    const currentType = this.getParamType();
    const currentName = this.getParamName();
    let pendingType = currentType;

    const commit = (): void => {
      const typedName = (nameInput.value || '').trim() || 'param';
      const finalType =
        (pendingType || customInput.value.trim() || currentType).trim() || currentType;
      this.setValue(`${finalType}${SEP}${typedName}`);
      Blockly.DropDownDiv.hideIfOwner(this);
    };

    // ---- Name row ----
    const nameRow = document.createElement('div');
    nameRow.style.cssText =
      'padding:6px 8px 4px;display:flex;align-items:center;gap:6px;';
    const nameLabel = document.createElement('span');
    nameLabel.textContent = 'name';
    nameLabel.style.cssText =
      'color:#fff;font-size:12px;font-family:sans-serif;min-width:36px;';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = currentName;
    nameInput.placeholder = 'paramName';
    nameInput.style.cssText =
      'flex:1;box-sizing:border-box;padding:4px 6px;font-size:13px;' +
      'font-family:sans-serif;border:1px solid rgba(255,255,255,0.3);' +
      'border-radius:3px;background:rgba(0,0,0,0.3);color:#fff;outline:none;';
    nameRow.appendChild(nameLabel);
    nameRow.appendChild(nameInput);

    const sep = document.createElement('div');
    sep.style.cssText =
      'height:1px;background:rgba(255,255,255,0.2);margin:4px 0;';

    // ---- Type list ----
    const typeList = document.createElement('div');
    typeList.style.cssText = 'max-height:240px;overflow-y:auto;';

    const typeHeader = document.createElement('div');
    typeHeader.textContent = 'type';
    typeHeader.style.cssText =
      'padding:4px 12px 2px;font-size:11px;font-family:sans-serif;' +
      'color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:0.5px;';
    typeList.appendChild(typeHeader);

    for (const [label, value] of this.presets_) {
      const opt = document.createElement('div');
      const selected = value === pendingType;
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
        pendingType = value;
        commit();
      });
      typeList.appendChild(opt);
    }

    const customSep = document.createElement('div');
    customSep.style.cssText =
      'height:1px;background:rgba(255,255,255,0.15);margin:4px 0;';
    typeList.appendChild(customSep);

    const customRow = document.createElement('div');
    customRow.style.cssText = 'padding:4px 8px 6px;';
    const customInput = document.createElement('input');
    customInput.type = 'text';
    customInput.placeholder = 'Custom type…';
    customInput.style.cssText =
      'width:100%;box-sizing:border-box;padding:4px 6px;font-size:13px;' +
      'font-family:sans-serif;border:1px solid rgba(255,255,255,0.3);' +
      'border-radius:3px;background:rgba(0,0,0,0.3);color:#fff;outline:none;';
    const isPreset = this.presets_.some(([, v]) => v === currentType);
    if (!isPreset && currentType) customInput.value = currentType;
    customRow.appendChild(customInput);
    typeList.appendChild(customRow);

    customInput.addEventListener('keydown', (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault();
        pendingType = customInput.value.trim() || pendingType;
        commit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        Blockly.DropDownDiv.hideIfOwner(this);
      }
    });

    nameInput.addEventListener('keydown', (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault();
        commit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        Blockly.DropDownDiv.hideIfOwner(this);
      }
    });

    contentDiv.appendChild(nameRow);
    contentDiv.appendChild(sep);
    contentDiv.appendChild(typeList);

    Blockly.DropDownDiv.showPositionedByField(this, () => {
      contentDiv.innerHTML = '';
    });

    nameInput.focus();
    nameInput.select();
  }
}

Blockly.fieldRegistry.register('field_typed_param_input', FieldTypedParamInput);
