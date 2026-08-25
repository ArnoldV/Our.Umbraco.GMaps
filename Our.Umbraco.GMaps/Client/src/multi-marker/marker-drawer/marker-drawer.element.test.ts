import { expect, fixture, html } from '@open-wc/testing';
import './marker-drawer.element.js';
import type GMapsMarkerDrawerElement from './marker-drawer.element.js';
import type { Marker, MarkerColor } from '../../types.js';

const MARKER: Marker = {
  key: 'a',
  friendlyName: 'Warehouse',
  description: 'Gate 4',
  color: '#2d7ef7',
  full_address: '88 Dock Rd, Port Melbourne VIC 3207',
  coordinates: { lat: -37.834, lng: 144.926 },
};

const PALETTE: MarkerColor[] = [
  { label: 'Logistics', value: '#2d7ef7' },
  { label: 'Retail', value: '#d64545' },
];

/** What the backoffice colour editor stores: bare hex, no labels, a blank row. */
const BACKOFFICE_PALETTE: MarkerColor[] = [
  { label: '', value: 'e61414' },
  { label: '', value: 'de2eea' },
  { label: '', value: '' },
];

/** Assertions read `draft`: `value` needs a modal context, absent in a fixture. */
async function drawer(
  data: Partial<{ marker: Marker; palette: MarkerColor[]; enableDescription: boolean }> = {},
) {
  const el = await fixture<GMapsMarkerDrawerElement>(
    html`<gmaps-marker-drawer></gmaps-marker-drawer>`,
  );
  el.data = {
    marker: data.marker ?? MARKER,
    palette: data.palette ?? PALETTE,
    enableDescription: data.enableDescription ?? true,
  };
  await el.updateComplete;
  return el;
}

describe('multi-marker/marker-drawer', () => {
  it('shows the marker address and coordinates', async () => {
    const el = await drawer();
    const text = el.shadowRoot!.textContent ?? '';

    expect(text).to.contain('88 Dock Rd');
    expect(text).to.contain('-37.834');
  });

  it('seeds the draft from the supplied marker', async () => {
    const el = await drawer();

    expect(el.draft.friendlyName).to.equal('Warehouse');
    expect(el.draft.key).to.equal('a');
  });

  it('renders one swatch per palette entry', async () => {
    const el = await drawer();

    expect(el.shadowRoot!.querySelectorAll('.swatch')).to.have.length(2);
  });

  it('paints a swatch stored as bare hex, which is not valid CSS on its own', async () => {
    const el = await drawer({ palette: BACKOFFICE_PALETTE });
    const swatch = el.shadowRoot!.querySelector('.swatch') as HTMLElement;

    expect(swatch.style.background).to.equal('rgb(230, 20, 20)');
  });

  it('skips the blank row the colour editor keeps for adding to', async () => {
    const el = await drawer({ palette: BACKOFFICE_PALETTE });

    expect(el.shadowRoot!.querySelectorAll('.swatch')).to.have.length(2);
  });

  it('marks the stored colour as selected across the missing hash', async () => {
    const el = await drawer({
      marker: { ...MARKER, color: 'de2eea' },
      palette: BACKOFFICE_PALETTE,
    });
    const selected = el.shadowRoot!.querySelectorAll('.swatch.selected');

    expect(selected).to.have.length(1);
    expect((selected[0] as HTMLElement).style.background).to.equal('rgb(222, 46, 234)');
  });

  it('does not flag a stored bare-hex colour as missing from the palette', async () => {
    const el = await drawer({
      marker: { ...MARKER, color: 'e61414' },
      palette: BACKOFFICE_PALETTE,
    });

    expect(el.shadowRoot!.textContent).to.not.contain('no longer in the palette');
  });

  it('stores the swatch colour in a form a template can use directly', async () => {
    const el = await drawer({ marker: { ...MARKER, color: undefined }, palette: BACKOFFICE_PALETTE });
    (el.shadowRoot!.querySelector('.swatch') as HTMLButtonElement).click();
    await el.updateComplete;

    expect(el.draft.color).to.equal('#e61414');
  });

  it('hides the colour control when every palette entry is blank', async () => {
    const el = await drawer({ palette: [{ label: '', value: '' }] });

    expect(el.shadowRoot!.querySelector('.colours')).to.equal(null);
  });

  it('hides the colour control when the palette is empty', async () => {
    const el = await drawer({ palette: [] });

    expect(el.shadowRoot!.querySelector('.colours')).to.equal(null);
  });

  it('hides the description field when the datatype disables it', async () => {
    const el = await drawer({ enableDescription: false });

    expect(el.shadowRoot!.querySelector('#description')).to.equal(null);
  });

  it('flags a colour that is no longer in the palette', async () => {
    const el = await drawer({ marker: { ...MARKER, color: '#123456' } });

    expect(el.shadowRoot!.textContent).to.contain('no longer in the palette');
  });

  it('updates the draft when the friendly name changes', async () => {
    const el = await drawer();
    const input = el.shadowRoot!.querySelector('#friendlyName') as HTMLInputElement;
    input.value = 'Renamed';
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await el.updateComplete;

    expect(el.draft.friendlyName).to.equal('Renamed');
  });

  it('updates the draft when the description changes', async () => {
    const el = await drawer();
    const input = el.shadowRoot!.querySelector('#description') as HTMLTextAreaElement;
    input.value = 'Gate 7';
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await el.updateComplete;

    expect(el.draft.description).to.equal('Gate 7');
  });

  it('selecting a swatch sets the colour', async () => {
    const el = await drawer();
    const swatches = el.shadowRoot!.querySelectorAll<HTMLElement>('.swatch');
    swatches[1].click();
    await el.updateComplete;

    expect(el.draft.color).to.equal('#d64545');
  });

  it('re-clicking the selected swatch clears the colour', async () => {
    const el = await drawer();
    const swatches = el.shadowRoot!.querySelectorAll<HTMLElement>('.swatch');
    swatches[0].click(); // already #2d7ef7
    await el.updateComplete;

    expect(el.draft.color).to.equal(undefined);
  });

  it('never changes the marker key', async () => {
    const el = await drawer();
    const input = el.shadowRoot!.querySelector('#friendlyName') as HTMLInputElement;
    input.value = 'Renamed';
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await el.updateComplete;

    expect(el.draft.key).to.equal('a');
  });

  it('does not mutate the marker it was given', async () => {
    const original = { ...MARKER };
    const el = await drawer({ marker: original });
    const input = el.shadowRoot!.querySelector('#friendlyName') as HTMLInputElement;
    input.value = 'Renamed';
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await el.updateComplete;

    expect(original.friendlyName).to.equal('Warehouse');
  });
});
