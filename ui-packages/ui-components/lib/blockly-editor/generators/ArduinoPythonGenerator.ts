import { PythonGenerator, pythonGenerator } from 'blockly/python';

import { registerPythonBlocks } from '../custom-blocks/pythonBlocks';

// The built-in Python handlers are attached to the bundled singleton by
// side-effect at module load, not in PythonGenerator's constructor — a fresh
// subclass starts with an empty forBlock. Object.assign copies handler refs
// onto our per-instance map without mutating the singleton.
export class ArduinoPythonGenerator extends PythonGenerator {
  // Widened from protected — handler modules under custom-blocks/ write
  // import_* / decl_* entries through this map (codegen.md §5).
  public declare definitions_: { [key: string]: string };

  constructor() {
    super('ArduinoPython');
    Object.assign(this.forBlock, pythonGenerator.forBlock);
    registerPythonBlocks(this);
  }

  // Wraps the body in `def loop():` + `App.run(user_loop=loop)` and prepends
  // import_* / decl_* / setup_* entries from definitions_ (codegen-iteration-3.md).
  // Bypasses PythonGenerator.finish() to keep ordering deterministic
  // (insertion order) and to keep `App.run` after the body, not inside it.
  override finish(code: string): string {
    const imports: string[] = [];
    const others: string[] = [];
    for (const key of Object.keys(this.definitions_)) {
      const value = this.definitions_[key];
      if (key.startsWith('import_')) imports.push(value);
      else others.push(value);
    }
    imports.push('from arduino.app_utils import App');

    const body = code ? this.prefixLines(code.replace(/\n+$/, ''), this.INDENT) : this.INDENT + this.PASS;

    const sections: string[] = [];
    sections.push(imports.join('\n'));
    if (others.length) sections.push(others.join('\n'));
    sections.push(`def loop():\n${body}`);
    sections.push('\nApp.run(user_loop=loop)');

    // Reset state per Blockly's generator contract: subsequent
    // workspaceToCode invocations must start from a clean slate.
    this.definitions_ = Object.create(null);
    this.nameDB_?.reset();

    return sections.join('\n') + '\n';
  }
}
