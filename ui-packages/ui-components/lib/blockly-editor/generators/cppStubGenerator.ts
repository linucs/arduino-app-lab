// Pass 1 stub generator for C++/Arduino sketches. Emits a fixed header and the
// serialised workspace JSON in a comment block so the sidecar→source write
// path can be verified end-to-end. Pass 2 will replace this with a real
// `Blockly.CodeGenerator` subclass that produces `setup()` / `loop()` with
// Arduino-flavoured block generation and `#include <Arduino.h>` collection.
export function generateCppStub(blocksJson: string): string {
  return [
    '// generated from blocks — do not edit',
    '// Pass 1 stub: real Arduino C++ generation is coming in Pass 2.',
    '/*',
    blocksJson,
    '*/',
    '',
    'void setup() {',
    '}',
    '',
    'void loop() {',
    '}',
    '',
  ].join('\n');
}
