// Pass 1 stub generator for Python files. Emits a fixed header and the
// serialised workspace JSON in a comment block so the sidecar→source write
// path can be verified end-to-end. Pass 2 will replace this with a generator
// that respects the Arduino Python framework conventions (`app.start()`,
// lifecycle handlers, etc.).
export function generatePythonStub(blocksJson: string): string {
  return [
    '# generated from blocks — do not edit',
    '# Pass 1 stub: real Arduino Python generation is coming in Pass 2.',
    '"""',
    blocksJson,
    '"""',
    '',
    'def main():',
    '    pass',
    '',
    '',
    'if __name__ == "__main__":',
    '    main()',
    '',
  ].join('\n');
}
