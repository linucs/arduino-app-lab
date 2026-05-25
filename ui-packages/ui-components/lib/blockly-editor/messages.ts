import { defineMessages } from 'react-intl';

export const messages = defineMessages({
  sidecarMalformed: {
    id: 'blockly-editor.sidecar-malformed',
    defaultMessage:
      'Blocks file is corrupted. Delete it to edit the source manually.',
    description:
      'Warning toast shown when the Blockly sidecar JSON cannot be parsed',
  },
  sidecarUnsupportedVersion: {
    id: 'blockly-editor.sidecar-unsupported-version',
    defaultMessage:
      'Blocks file from a newer App Lab. Read-only — update App Lab or delete it.',
    description:
      'Warning toast shown when the Blockly sidecar version is higher than SIDECAR_FORMAT_VERSION',
  },
  sidecarPartialLoad: {
    id: 'blockly-editor.sidecar-partial-load',
    defaultMessage:
      'Some blocks could not be restored — they may require an update or a missing catalog.',
    description:
      'Warning toast shown when Blockly fails to deserialize some block types from the sidecar',
  },
});
