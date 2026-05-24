import { PALETTE } from '../palette';

// Closed set: every entry must have a matching handler in ArduinoCppGenerator.
// Adding a block here without a handler will crash workspaceToCode.
export const cppToolbox = {
  kind: 'categoryToolbox',
  contents: [
    // @blockly/toolbox-search — registered by blocklyPlugins.ts import
    { kind: 'search', name: 'Search', colour: '#090F11', contents: [] },

    // ── Hardware categories ──────────────────────────────────────────────────
    // Empty placeholders keep position stable; real blocks are injected by
    // the catalog merger (mergeToolboxCategories in BlocklyEditor.tsx).
    { kind: 'category', name: 'Control',        colour: PALETTE.Control,     contents: [] },
    { kind: 'category', name: 'Input / Output', colour: PALETTE.InputOutput, contents: [] },
    { kind: 'category', name: 'Messaging',      colour: PALETTE.Messaging,   contents: [] },
    { kind: 'category', name: 'Sensors',        colour: PALETTE.Sensors,     contents: [] },
    { kind: 'category', name: 'Motion',         colour: PALETTE.Motion,      contents: [] },
    { kind: 'category', name: 'Colour',         colour: PALETTE.Colour,      contents: [] },
    { kind: 'category', name: 'Displays',       colour: PALETTE.Displays,    contents: [] },

    // ── Programming constructs ───────────────────────────────────────────────
    {
      kind: 'category',
      name: 'Logic',
      colour: PALETTE.Logic,
      contents: [
        { kind: 'block', type: 'controls_if' },
        { kind: 'block', type: 'controls_switch_case' },
        { kind: 'block', type: 'logic_compare' },
        { kind: 'block', type: 'logic_operation' },
        { kind: 'block', type: 'logic_negate' },
        { kind: 'block', type: 'logic_boolean' },
        { kind: 'block', type: 'logic_ternary' },
      ],
    },
    {
      kind: 'category',
      name: 'Loops',
      colour: PALETTE.Loops,
      contents: [
        { kind: 'block', type: 'controls_repeat_ext' },
        { kind: 'block', type: 'controls_whileUntil' },
        { kind: 'block', type: 'controls_for' },
        { kind: 'block', type: 'controls_flow_statements' },
      ],
    },
    {
      kind: 'category',
      name: 'Mathematics',
      colour: PALETTE.Mathematics,
      contents: [
        { kind: 'block', type: 'math_number' },
        { kind: 'block', type: 'math_arithmetic' },
        { kind: 'block', type: 'math_modulo' },
        { kind: 'block', type: 'math_single' },
        { kind: 'block', type: 'math_trig' },
        { kind: 'block', type: 'math_constant' },
        { kind: 'block', type: 'math_round' },
        { kind: 'block', type: 'math_number_property' },
      ],
    },
    {
      kind: 'category',
      name: 'Text',
      colour: PALETTE.Text,
      contents: [{ kind: 'block', type: 'text' }],
    },
    {
      kind: 'category',
      name: 'Variables',
      colour: PALETTE.Variables,
      custom: 'CREATE_TYPED_VARIABLE',
    },
    {
      kind: 'category',
      name: 'Functions',
      colour: PALETTE.Functions,
      contents: [
        { kind: 'block', type: 'cpp_function_def' },
        { kind: 'block', type: 'cpp_function_call' },
        { kind: 'block', type: 'cpp_function_call_expr' },
        { kind: 'block', type: 'cpp_return' },
      ],
    },
  ],
};
