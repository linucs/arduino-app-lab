import * as Blockly from 'blockly';

import {
  ArduinoCppGenerator,
  CppOrder,
} from '../generators/ArduinoCppGenerator';

const BLOCK_DEFS = [
  {
    type: 'cpp_led',
    message0: 'set LED %1  R %2  G %3  B %4',
    args0: [
      {
        type: 'field_dropdown',
        name: 'LED',
        options: [
          ['3', '3'],
          ['4', '4'],
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
      'Set the R / G / B channels of an MCU-side onboard RGB LED (3 or 4).',
  },
  {
    type: 'cpp_wait',
    message0: 'wait %1 ms',
    args0: [{ type: 'input_value', name: 'MS', check: 'Number' }],
    previousStatement: null,
    nextStatement: null,
    colour: 30,
    tooltip: 'Pause execution for the given number of milliseconds.',
  },
  {
    type: 'cpp_print',
    message0: 'print %1',
    args0: [{ type: 'input_value', name: 'TEXT' }],
    previousStatement: null,
    nextStatement: null,
    colour: 30,
    tooltip:
      'Print a value to the serial monitor via the Arduino Router Bridge.',
  },
];

// Module-level dedup for Blockly.Blocks (a global registry) per
// codegen.md §6. StrictMode double-mount, HMR, and adapter re-imports all
// re-invoke this registration — without the guard, defineBlocksWithJsonArray
// logs "Block definition overwrites previous definition" warnings.
const registered = new Set<string>();

export function registerCppBlocks(generator: ArduinoCppGenerator): void {
  const fresh = BLOCK_DEFS.filter((def) => !registered.has(def.type));
  if (fresh.length > 0) {
    Blockly.common.defineBlocksWithJsonArray(fresh);
    fresh.forEach((def) => registered.add(def.type));
  }

  generator.forBlock['cpp_led'] = (block, gen): string => {
    const led = block.getFieldValue('LED');
    const r = block.getFieldValue('R');
    const g = block.getFieldValue('G');
    const b = block.getFieldValue('B');

    // Idempotent per-LED setup contribution (key = LED number only).
    // Multiple cpp_led blocks touching the same LED collapse to one
    // definitions_ entry that brings all 3 channels up as OUTPUT and writes
    // them HIGH (= OFF, active-LOW).
    gen.definitions_[`setup_led_LED${led}`] =
      `pinMode(LED${led}_R, OUTPUT);\n` +
      `pinMode(LED${led}_G, OUTPUT);\n` +
      `pinMode(LED${led}_B, OUTPUT);\n` +
      `digitalWrite(LED${led}_R, HIGH);\n` +
      `digitalWrite(LED${led}_G, HIGH);\n` +
      `digitalWrite(LED${led}_B, HIGH);`;

    // Active-LOW: TRUE checkbox → LOW (on), FALSE → HIGH (off).
    return (
      `digitalWrite(LED${led}_R, ${r === 'TRUE' ? 'LOW' : 'HIGH'});\n` +
      `digitalWrite(LED${led}_G, ${g === 'TRUE' ? 'LOW' : 'HIGH'});\n` +
      `digitalWrite(LED${led}_B, ${b === 'TRUE' ? 'LOW' : 'HIGH'});\n`
    );
  };

  generator.forBlock['cpp_wait'] = (block, gen): string => {
    const ms = gen.valueToCode(block, 'MS', CppOrder.NONE) || '0';
    return `delay(${ms});\n`;
  };

  generator.forBlock['cpp_print'] = (block, gen): string => {
    const text = gen.valueToCode(block, 'TEXT', CppOrder.NONE) || '""';
    gen.definitions_['include_router_bridge'] =
      '#include <Arduino_RouterBridge.h>';
    gen.definitions_['setup_monitor'] = 'Monitor.begin();';
    return `Monitor.println(${text});\n`;
  };
}
