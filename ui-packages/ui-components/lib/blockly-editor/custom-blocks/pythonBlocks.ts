import * as Blockly from 'blockly';
import { Order } from 'blockly/python';

import { ArduinoPythonGenerator } from '../generators/ArduinoPythonGenerator';

const BLOCK_DEFS = [
  {
    type: 'python_led',
    message0: 'set LED %1  R %2  G %3  B %4',
    args0: [
      {
        type: 'field_dropdown',
        name: 'LED',
        options: [
          ['1', '1'],
          ['2', '2'],
        ],
      },
      { type: 'field_checkbox', name: 'R', checked: false },
      { type: 'field_checkbox', name: 'G', checked: false },
      { type: 'field_checkbox', name: 'B', checked: false },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: 30,
    tooltip:
      'Set the R / G / B channels of a CPU-side onboard RGB LED (1 or 2).',
  },
  {
    type: 'python_wait',
    message0: 'wait %1 ms',
    args0: [{ type: 'input_value', name: 'MS', check: 'Number' }],
    previousStatement: null,
    nextStatement: null,
    colour: 30,
    tooltip: 'Pause execution for the given number of milliseconds.',
  },
];

// Module-level dedup for Blockly.Blocks per codegen.md §6 — same reason
// as cppBlocks.ts.
const registered = new Set<string>();

export function registerPythonBlocks(generator: ArduinoPythonGenerator): void {
  const fresh = BLOCK_DEFS.filter((def) => !registered.has(def.type));
  if (fresh.length > 0) {
    Blockly.common.defineBlocksWithJsonArray(fresh);
    fresh.forEach((def) => registered.add(def.type));
  }

  generator.forBlock['python_led'] = (block, gen): string => {
    const led = block.getFieldValue('LED');
    const r = block.getFieldValue('R') === 'TRUE' ? 'True' : 'False';
    const g = block.getFieldValue('G') === 'TRUE' ? 'True' : 'False';
    const b = block.getFieldValue('B') === 'TRUE' ? 'True' : 'False';

    gen.definitions_['import_leds'] = 'from arduino.app_utils import Leds';

    return `Leds.set_led${led}_color(${r}, ${g}, ${b})\n`;
  };

  generator.forBlock['python_wait'] = (block, gen): string => {
    // MULTIPLICATIVE so an additive input like `a + b` gets parenthesized
    // — otherwise `time.sleep(a + b / 1000)` would parse as `a + (b/1000)`.
    const ms = gen.valueToCode(block, 'MS', Order.MULTIPLICATIVE) || '0';
    gen.definitions_['import_time'] = 'import time';
    return `time.sleep(${ms} / 1000)\n`;
  };
}
