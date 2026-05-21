import { PythonGenerator, pythonGenerator } from 'blockly/python';

// The built-in Python handlers are attached to the bundled singleton by
// side-effect at module load, not in PythonGenerator's constructor — a fresh
// subclass starts with an empty forBlock. Object.assign copies handler refs
// onto our per-instance map without mutating the singleton.
export class ArduinoPythonGenerator extends PythonGenerator {
  constructor() {
    super('ArduinoPython');
    Object.assign(this.forBlock, pythonGenerator.forBlock);
  }

  // Iteration 2 passthrough — delegates to PythonGenerator.finish() (hoists
  // imports, prepends definitions_). Iteration 3 replaces this with the
  // Arduino Python framework wrap (app.start() + lifecycle handlers).
  override finish(code: string): string {
    return super.finish(code);
  }
}
