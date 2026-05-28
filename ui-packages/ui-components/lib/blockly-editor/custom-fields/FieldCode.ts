import { closeBrackets } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { cpp } from '@codemirror/lang-cpp';
import { python } from '@codemirror/lang-python';
import {
  bracketMatching,
  foldGutter,
  foldKeymap,
  indentOnInput,
  indentUnit,
  syntaxHighlighting,
} from '@codemirror/language';
import { highlightSelectionMatches } from '@codemirror/search';
import { EditorState } from '@codemirror/state';
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from '@codemirror/view';
import * as Blockly from 'blockly';

import {
  customTags,
  highlightStyle,
} from '../../code-mirror/extensions/language/highlightStyle';
import { tabKeyBinding } from '../../code-editor/setup/codeEditorKeyBindings';

let currentLanguage: 'cpp' | 'python' = 'cpp';

export function setFieldCodeLanguage(lang: 'cpp' | 'python'): void {
  currentLanguage = lang;
}

const MAX_DISPLAY_LENGTH = 30;

let activeFieldCode: FieldCode | null = null;

class FieldCode extends Blockly.Field<string> {
  override SERIALIZABLE = true;
  override EDITABLE = true;

  private editorView_: EditorView | null = null;
  private modalEl_: HTMLDivElement | null = null;

  constructor(value?: string, validator?: Blockly.FieldValidator<string>) {
    super(value || '', validator);
  }

  static override fromJson(
    options: Record<string, unknown>,
  ): FieldCode {
    return new FieldCode(options['text'] as string | undefined);
  }

  protected override doClassValidation_(value?: string): string | null {
    if (value === undefined || value === null) return '';
    return String(value);
  }

  protected override getDisplayText_(): string {
    const val = this.getValue();
    if (!val) return ' ✎ click to edit';
    const lines = val.split('\n');
    const first =
      lines[0].length > MAX_DISPLAY_LENGTH
        ? lines[0].slice(0, MAX_DISPLAY_LENGTH) + '…'
        : lines[0];
    if (lines.length > 1) return `${first}  (+${lines.length - 1} lines)`;
    return first;
  }

  protected override showEditor_(): void {
    if (activeFieldCode) return;
    activeFieldCode = this;
    this.createModal_();
  }

  private createModal_(): void {
    const modal = document.createElement('div');
    modal.className = 'fieldCode-modal';

    const backdrop = document.createElement('div');
    backdrop.className = 'fieldCode-backdrop';
    backdrop.addEventListener('click', () => this.closeModal_());

    const dialog = document.createElement('div');
    dialog.className = 'fieldCode-dialog';

    const header = document.createElement('div');
    header.className = 'fieldCode-header';
    const title = document.createElement('span');
    title.className = 'fieldCode-title';
    title.textContent =
      currentLanguage === 'python' ? 'Custom Code (Python)' : 'Custom Code (C++)';
    const doneBtn = document.createElement('button');
    doneBtn.textContent = 'Done';
    doneBtn.className = 'fieldCode-done';
    doneBtn.addEventListener('click', () => this.closeModal_());
    header.appendChild(title);
    header.appendChild(doneBtn);

    const editorContainer = document.createElement('div');
    editorContainer.className = 'fieldCode-editorContainer';

    dialog.appendChild(header);
    dialog.appendChild(editorContainer);
    modal.appendChild(backdrop);
    modal.appendChild(dialog);
    document.body.appendChild(modal);
    this.modalEl_ = modal;

    const langExt =
      currentLanguage === 'python'
        ? [python(), indentUnit.of('    ')]
        : [cpp()];

    const state = EditorState.create({
      doc: this.getValue() || '',
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        history(),
        drawSelection(),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        highlightSelectionMatches(),
        foldGutter(),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...foldKeymap,
          tabKeyBinding,
          { key: 'Escape', run: () => { this.closeModal_(); return true; } },
        ]),
        ...langExt,
        syntaxHighlighting(highlightStyle(customTags)),
        EditorView.theme({
          '&': {
            height: '100%',
            backgroundColor: '#171e21',
            fontSize: '13px',
          },
          '.cm-scroller': {
            fontFamily: '"Roboto Mono", monospace, "Courier New"',
            lineHeight: '1.5',
            overflow: 'auto',
          },
          '.cm-content': { padding: '8px 0' },
          '.cm-gutters': {
            backgroundColor: '#171e21',
            borderRight: '1px solid #2a3439',
            color: '#5d6a6b',
            minWidth: '40px',
          },
          '.cm-activeLineGutter': {
            backgroundColor: 'transparent',
            color: '#c9d2d2',
          },
          '.cm-activeLine': { backgroundColor: 'rgba(255,255,255,0.03)' },
          '.cm-cursor': { borderLeftColor: '#25c2c7' },
          '.cm-selectionBackground': {
            backgroundColor: 'rgba(37,194,199,0.25) !important',
          },
          '.cm-matchingBracket': {
            backgroundColor: 'rgba(37,194,199,0.3)',
            outline: 'none',
          },
        }),
      ],
    });

    this.editorView_ = new EditorView({ state, parent: editorContainer });
    this.editorView_.focus();
  }

  private closeModal_(): void {
    if (this.editorView_) {
      const newValue = this.editorView_.state.doc.toString();
      this.editorView_.destroy();
      this.editorView_ = null;
      this.setValue(newValue);
    }
    if (this.modalEl_) {
      this.modalEl_.remove();
      this.modalEl_ = null;
    }
    activeFieldCode = null;
  }

  override dispose(): void {
    if (activeFieldCode === this) {
      this.closeModal_();
    }
    super.dispose();
  }
}

Blockly.fieldRegistry.register('field_code', FieldCode);
