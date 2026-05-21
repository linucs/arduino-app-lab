// Closed set: every entry must have a matching handler in ArduinoCppGenerator.
// Adding a block here without a handler will crash workspaceToCode.
export const cppToolbox = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: 'Logic',
      colour: '210',
      contents: [
        { kind: 'block', type: 'controls_if' },
        { kind: 'block', type: 'logic_compare' },
        { kind: 'block', type: 'logic_operation' },
        { kind: 'block', type: 'logic_negate' },
        { kind: 'block', type: 'logic_boolean' },
      ],
    },
    {
      kind: 'category',
      name: 'Loops',
      colour: '120',
      contents: [
        { kind: 'block', type: 'controls_repeat_ext' },
        { kind: 'block', type: 'controls_whileUntil' },
      ],
    },
    {
      kind: 'category',
      name: 'Math',
      colour: '230',
      contents: [
        { kind: 'block', type: 'math_number' },
        { kind: 'block', type: 'math_arithmetic' },
        { kind: 'block', type: 'math_modulo' },
      ],
    },
    {
      kind: 'category',
      name: 'Text',
      colour: '160',
      contents: [{ kind: 'block', type: 'text' }],
    },
    {
      kind: 'category',
      name: 'Variables',
      colour: '330',
      custom: 'VARIABLE',
    },
    {
      kind: 'category',
      name: 'Functions',
      colour: '290',
      custom: 'PROCEDURE',
    },
    {
      kind: 'category',
      name: 'App Lab',
      colour: '30',
      contents: [
        { kind: 'block', type: 'cpp_led' },
        { kind: 'block', type: 'cpp_wait' },
        { kind: 'block', type: 'cpp_print' },
      ],
    },
  ],
};
