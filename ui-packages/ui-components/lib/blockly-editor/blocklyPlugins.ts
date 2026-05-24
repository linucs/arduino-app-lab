/**
 * Step 7: All @blockly/* plugin initialization.
 *
 * Field plugins (field-multilineinput, field-grid-dropdown, field-date,
 * field-dependent-dropdown) are registered once at module-load time.
 *
 * Workspace UX plugins (WorkspaceSearch, ZoomToFitControl,
 * shadow-block-converter) are initialized per-workspace and return a cleanup
 * function called when the workspace is disposed.
 */
import * as Blockly from 'blockly';

// --- Side-effect imports (self-register on load) ---
// block-plus-minus: adds +/- mutator buttons to if/list/function blocks.
import '@blockly/block-plus-minus';
// toolbox-search: registers the 'search' toolbox category kind.
import '@blockly/toolbox-search';

// @blockly/block-plus-minus v9 calls the v12-deprecated
// workspace.getVariableUsesById(id). Patch the prototype once so it forwards
// to the replacement static API, suppressing the console warning.
;(Blockly.Workspace.prototype as unknown as {
  getVariableUsesById: (id: string) => Blockly.Block[];
}).getVariableUsesById = function(
  this: Blockly.Workspace,
  id: string,
): Blockly.Block[] {
  return Blockly.Variables.getVariableUsesById(this, id);
};

// --- Workspace UX plugins ---
import { TypedVariableModal } from '@blockly/plugin-typed-variable-modal';
import { WorkspaceSearch } from '@blockly/plugin-workspace-search';
import { ZoomToFitControl } from '@blockly/zoom-to-fit';
import { shadowBlockConversionChangeListener } from '@blockly/shadow-block-converter';

// --- Field plugins (side-effect imports: self-register in Blockly field registry) ---
import '@blockly/field-grid-dropdown'; // → 'field_grid_dropdown'
import '@blockly/field-dependent-dropdown'; // → 'field_dependent_dropdown'
import '@blockly/field-date'; // → 'field_date'
import { registerFieldMultilineInput } from '@blockly/field-multilineinput';

// --- Field registration ---
// field_grid_dropdown, field_date, field_dependent_dropdown: self-register on import.
// field_multilinetext: requires explicit call.
registerFieldMultilineInput(); // → 'field_multilinetext'

// Callback key used by the toolbox button and TypedVariableModal together.
const TYPED_VAR_CALLBACK_KEY = 'CREATE_TYPED_VARIABLE_BUTTON';

// Patch applied once: remove type constraints from both dynamic variable blocks
// so standard Blockly value blocks (math_number, logic_boolean, text, …) can
// connect freely regardless of C++ variable type.
//
// The problem is structural: C++ types ('int', 'float', 'bool', …) are not
// Blockly's built-in output types ("Number", "Boolean", "String", …), so
// Blockly's connection checker always rejects the pairing.
//
// Both blocks share a built-in onchange that re-applies setCheck(variableType)
// on every variable change (dropdown selection, workspace load). Patching init
// alone is insufficient — the onchange must be suppressed too.
//
//   variables_set_dynamic → VALUE input setCheck(null): accept any assignable value
//   variables_get_dynamic → output setCheck(null): usable wherever any value fits
//
// C++ types are resolved at codegen time from the VariableModel; the UI
// connection check is a false restriction with no codegen benefit.
let _dynamicVarPatched = false;
function patchDynamicVariableBlocks(): void {
  if (_dynamicVarPatched) return;
  _dynamicVarPatched = true;

  // onchange must NOT be in the block definition object — Blockly copies block-def
  // properties onto the instance before calling init, so a definition-level onchange
  // would already be set when the contextMenu_variableDynamicSetterGetter extension
  // tries to mixin its own onchange, causing "Mixin will overwrite block members".
  // Instead, override onchange on the instance AFTER originalInit (and its extensions)
  // have finished running.
  const noop = function(): void {};

  const setDef = Blockly.Blocks['variables_set_dynamic'];
  if (setDef) {
    const originalSetInit = setDef.init as (this: Blockly.Block) => void;
    Blockly.Blocks['variables_set_dynamic'] = {
      ...setDef,
      init(this: Blockly.Block): void {
        originalSetInit.call(this);
        this.getInput('VALUE')?.setCheck(null);
        (this as unknown as { onchange: () => void }).onchange = noop;
      },
    };
  }

  const getDef = Blockly.Blocks['variables_get_dynamic'];
  if (getDef) {
    const originalGetInit = getDef.init as (this: Blockly.Block) => void;
    Blockly.Blocks['variables_get_dynamic'] = {
      ...getDef,
      init(this: Blockly.Block): void {
        originalGetInit.call(this);
        this.outputConnection?.setCheck(null);
        (this as unknown as { onchange: () => void }).onchange = noop;
      },
    };
  }
}

/**
 * C++ variable types shown in the typed-variable creation modal.
 * Tuples are [display label, type token] — both identical here so the
 * generated variable block carries the C++ type as its Blockly type.
 *
 * Grouped by family for readability in the picker:
 *   signed integers → unsigned integers → floats → bool/char/String
 * Aliases (byte=uint8_t, word=uint16_t) are kept alongside their
 * fixed-width equivalents so sketch code can match either style.
 */
export const CPP_VARIABLE_TYPES: [string, string][] = [
  // signed integers
  ['int',     'int'],
  ['long',    'long'],
  ['int8_t',  'int8_t'],
  ['int16_t', 'int16_t'],
  ['int32_t', 'int32_t'],
  // unsigned integers
  ['unsigned int',  'unsigned int'],
  ['unsigned long', 'unsigned long'],
  ['byte',     'byte'],
  ['word',     'word'],
  ['uint8_t',  'uint8_t'],
  ['uint16_t', 'uint16_t'],
  ['uint32_t', 'uint32_t'],
  // floating point
  ['float',  'float'],
  ['double', 'double'],
  // other
  ['bool',   'bool'],
  ['char',   'char'],
  ['String', 'String'],
];

/**
 * Wire the typed-variable modal for a C++ workspace.
 * When `onCreateVariable` is provided the built-in TypedVariableModal plugin
 * is bypassed: a button callback opens the React dialog instead and creates
 * the variable after client-side validation.  Returns a cleanup function.
 */
export function initTypedVariableModal(
  workspace: Blockly.WorkspaceSvg,
  types: [string, string][],
  onCreateVariable?: (
    types: [string, string][],
  ) => Promise<{ name: string; type: string } | null>,
): () => void {
  patchDynamicVariableBlocks();

  // Flyout content: a "Create typed variable" button + all existing var blocks.
  const createFlyout = (ws: Blockly.WorkspaceSvg): Element[] => {
    const button = document.createElement('button');
    button.setAttribute('text', 'Create typed variable…');
    button.setAttribute('callbackKey', TYPED_VAR_CALLBACK_KEY);
    const varBlocks = Blockly.VariablesDynamic.flyoutCategoryBlocks(ws);
    return [button, ...varBlocks];
  };

  workspace.registerToolboxCategoryCallback(
    'CREATE_TYPED_VARIABLE',
    createFlyout,
  );

  if (onCreateVariable) {
    // React-dialog path: bypass the plugin, wire the button to the callback.
    workspace.registerButtonCallback(
      TYPED_VAR_CALLBACK_KEY,
      async (): Promise<void> => {
        const result = await onCreateVariable(types);
        if (!result) return;

        const trimmed = result.name.replace(/[\s\xa0]+/g, ' ').trim();
        if (
          !trimmed ||
          trimmed === Blockly.Msg.RENAME_VARIABLE ||
          trimmed === Blockly.Msg.NEW_VARIABLE
        ) {
          Blockly.dialog.alert(
            Blockly.Msg['TYPED_VAR_MODAL_INVALID_NAME'] ??
              'Name is not valid. Please choose a different name.',
          );
          return;
        }

        const existing = Blockly.Variables.nameUsedWithAnyType(
          trimmed,
          workspace,
        );
        if (existing) {
          const msg =
            existing.getType() === result.type
              ? (Blockly.Msg.VARIABLE_ALREADY_EXISTS ?? 'Variable "%1" already exists.').replace('%1', existing.getName())
              : (Blockly.Msg.VARIABLE_ALREADY_EXISTS_FOR_ANOTHER_TYPE ??
                  'Variable "%1" already exists for another type "%2".').replace('%1', existing.getName()).replace('%2', existing.getType());
          Blockly.dialog.alert(msg);
          return;
        }

        workspace.createVariable(trimmed, result.type);
      },
    );

    return () => {
      workspace.removeButtonCallback(TYPED_VAR_CALLBACK_KEY);
      workspace.removeToolboxCategoryCallback('CREATE_TYPED_VARIABLE');
    };
  }

  // Fallback: use the original TypedVariableModal plugin.
  const modal = new TypedVariableModal(workspace, TYPED_VAR_CALLBACK_KEY, types);
  modal.init();

  return () => {
    modal.dispose();
    workspace.removeToolboxCategoryCallback('CREATE_TYPED_VARIABLE');
  };
}

/**
 * Initialize per-workspace UX plugins after `Blockly.inject`.
 * Returns a cleanup function — call it in the useEffect cleanup to avoid leaks.
 */
export function initWorkspacePlugins(
  workspace: Blockly.WorkspaceSvg,
): () => void {
  const workspaceSearch = new WorkspaceSearch(workspace);
  workspaceSearch.init();

  const zoomToFit = new ZoomToFitControl(workspace);
  zoomToFit.init();

  workspace.addChangeListener(shadowBlockConversionChangeListener);

  return () => {
    workspace.removeChangeListener(shadowBlockConversionChangeListener);
    zoomToFit.dispose();
    workspaceSearch.dispose();
  };
}
