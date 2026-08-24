import { expect, fixture, html } from '@open-wc/testing';
import './snazzymaps-editor.element.js';
import type SnazzyMapsPropertyEditorUiElement from './snazzymaps-editor.element.js';
import type { SnazzyMapsValue } from '../types.js';

const CUSTOM_STYLE = '[{"elementType":"geometry","stylers":[{"color":"#212121"}]}]';

async function editor(value?: unknown) {
  const el = await fixture<SnazzyMapsPropertyEditorUiElement>(
    html`<gmaps-snazzymaps></gmaps-snazzymaps>`,
  );
  el.value = value as SnazzyMapsValue | undefined;
  await el.updateComplete;
  return el;
}

const customStyleField = (el: SnazzyMapsPropertyEditorUiElement) =>
  el.shadowRoot!.querySelector('uui-textarea.custom-style') as HTMLElement & { value: string };

describe('snazzy maps prevalue editor', () => {
  it('keeps a custom style typed into the textarea', async () => {
    const el = await editor({ apiKey: 'k', customstyle: CUSTOM_STYLE });

    expect(customStyleField(el).value).to.equal(CUSTOM_STYLE);
    expect(el.value?.customstyle).to.equal(CUSTOM_STYLE);
  });

  // Before 4.0 `customstyle` was a flag meaning "the JSON in selectedstyle was
  // typed by hand", so old configuration carries a boolean here (#264).
  it('reads a legacy custom style out of selectedstyle', async () => {
    const el = await editor({
      apiKey: 'k',
      customstyle: true,
      selectedstyle: { json: CUSTOM_STYLE },
    });

    expect(customStyleField(el).value).to.equal(CUSTOM_STYLE);
    expect(el.value?.customstyle).to.equal(CUSTOM_STYLE);
    expect(el.value?.selectedstyle).to.equal(undefined);
  });

  it('keeps a picked snazzy style when the legacy flag says it was not custom', async () => {
    const el = await editor({
      apiKey: 'k',
      customstyle: false,
      selectedstyle: {
        id: 42,
        name: 'Midnight',
        json: CUSTOM_STYLE,
        tags: ['dark'],
        colors: ['#212121'],
        createdBy: { name: 'Someone' },
      },
    });

    expect(customStyleField(el).value).to.equal('');
    expect(el.value?.selectedstyle?.name).to.equal('Midnight');
    expect(el.value?.customstyle).to.equal(undefined);
  });

  // Clicking "Delete Mapstyle" used to leave `selectedstyle: {}` behind, which the
  // style card cannot render.
  it('treats a cleared selectedstyle as no style at all', async () => {
    const el = await editor({ apiKey: 'k', selectedstyle: {} });

    expect(el.shadowRoot!.querySelector('.selected-style')).to.equal(null);
    expect(el.value?.selectedstyle).to.equal(undefined);
    expect(customStyleField(el).value).to.equal('');
  });
});
