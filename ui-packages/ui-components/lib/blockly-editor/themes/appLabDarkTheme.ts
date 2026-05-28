import * as Blockly from 'blockly';

import { PALETTE } from '../palette';

export const appLabDarkTheme = Blockly.Theme.defineTheme('appLabDark', {
  name: 'appLabDark',
  base: Blockly.Themes.Classic,
  blockStyles: {
    logic_blocks:            { colourPrimary: PALETTE.Logic },
    loop_blocks:             { colourPrimary: PALETTE.Loops },
    math_blocks:             { colourPrimary: PALETTE.Mathematics },
    text_blocks:             { colourPrimary: PALETTE.Text },
    list_blocks:             { colourPrimary: PALETTE.Lists },
    variable_blocks:         { colourPrimary: PALETTE.Variables },
    variable_dynamic_blocks: { colourPrimary: PALETTE.Variables },
    procedure_blocks:        { colourPrimary: PALETTE.Functions },
  },
  componentStyles: {
    workspaceBackgroundColour: '#171E21',
    toolboxBackgroundColour: '#090F11',
    toolboxForegroundColour: '#C9D2D2',
    flyoutBackgroundColour: '#090F11',
    flyoutForegroundColour: '#C9D2D2',
    flyoutOpacity: 1,
    scrollbarColour: '#5D6A6B',
    scrollbarOpacity: 0.6,
    insertionMarkerColour: '#25C2C7',
    insertionMarkerOpacity: 0.4,
    markerColour: '#25C2C7',
    cursorColour: '#25C2C7',
    selectedGlowColour: '#25C2C7',
    selectedGlowOpacity: 0.6,
    replacementGlowColour: '#25C2C7',
    replacementGlowOpacity: 0.4,
  },
  fontStyle: {
    family: '"Open Sans", "Lucida Grande", lucida, verdana, sans-serif',
    weight: '400',
    size: 10,
  },
});
