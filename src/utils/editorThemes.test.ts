import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getFontStack,
  isLightHexColor,
  normalizeEditorPreferences,
  NOVEL_FONTS,
  NOVEL_THEMES,
} from './editorThemes';

test('isLightHexColor distinguishes dark nocturnal themes from light paper themes', () => {
  assert.equal(isLightHexColor('#13141c'), false);
  assert.equal(isLightHexColor('#111a17'), false);
  assert.equal(isLightHexColor('#f4ecd8'), true);
  assert.equal(isLightHexColor('#faf8f4'), true);
});

test('normalizeEditorPreferences migrates legacy fontFamily and clamps ranges', () => {
  const migrated = normalizeEditorPreferences({
    fontFamily: 'serif',
    fontSize: 99,
    lineHeight: 0.5,
    paragraphSpacing: 5,
    firstLineIndent: true,
    textAlign: 'justify',
  });

  assert.equal(migrated.fontFamily, 'lora');
  assert.equal(migrated.fontSize, 28);
  assert.equal(migrated.lineHeight, 1.35);
  assert.equal(migrated.paragraphSpacing, 2.4);
  assert.equal(migrated.firstLineIndent, true);
  assert.equal(migrated.textAlign, 'justify');
  assert.equal(migrated.themeId, 'midnight-ink');
});

test('NOVEL_THEMES and NOVEL_FONTS provide valid stacks and hex pairs', () => {
  assert.ok(NOVEL_THEMES.length >= 6);
  assert.ok(NOVEL_FONTS.length >= 6);
  for (const font of NOVEL_FONTS) {
    assert.ok(getFontStack(font.id).length > 5);
  }
});
