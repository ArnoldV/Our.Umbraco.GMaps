/// <reference types='@types/google.maps' />
import { aTimeout, expect, fixture, html } from '@open-wc/testing';
import './default-location-config.element.js';
import type GmapsDefaultLocationConfigElement from './default-location-config.element.js';
import { FakeMapsApi } from '../maps/fake-maps-api.js';
import type { ConfigSiblings } from './config-siblings.controller.js';

/**
 * A ConfigSiblings that keeps the sibling values in memory, records writes, and
 * can replay a change the way the datatype workspace would when another
 * configuration field is edited.
 */
class FakeConfigSiblings implements ConfigSiblings {
  readonly writes: Array<{ alias: string; value: unknown }> = [];
  #values: Record<string, unknown>;
  #listeners = new Map<string, Array<(value: unknown) => void>>();

  constructor(values: Record<string, unknown> = {}) {
    this.#values = { ...values };
  }

  observeValue<T>(alias: string, onChange: (value: T | undefined) => void) {
    const listeners = this.#listeners.get(alias) ?? [];
    listeners.push(onChange as (value: unknown) => void);
    this.#listeners.set(alias, listeners);
    onChange(this.#values[alias] as T | undefined);
  }

  setValue(alias: string, value: unknown) {
    this.writes.push({ alias, value });
    this.#values[alias] = value;
  }

  /** Another configuration field changed while this editor is open. */
  emit(alias: string, value: unknown) {
    this.#values[alias] = value;
    for (const listener of this.#listeners.get(alias) ?? []) listener(value);
  }

  lastWriteTo(alias: string) {
    return [...this.writes].reverse().find((write) => write.alias === alias)?.value;
  }
}

async function editor(
  options: {
    value?: string;
    siblings?: Record<string, unknown>;
    site?: { apiKey?: string | null; defaultLocation?: string | null; zoomLevel?: number | null };
  } = {},
) {
  const api = new FakeMapsApi();
  const site = { getSettings: async () => options.site };
  const siblings = new FakeConfigSiblings({
    apikey: 'test-key',
    zoom: 17,
    ...(options.siblings ?? {}),
  });
  const el = await fixture<GmapsDefaultLocationConfigElement>(
    html`<gmaps-default-location-config></gmaps-default-location-config>`,
  );
  el.api = api;
  el.siblings = siblings;
  el.site = site;
  el.value = options.value;
  await el.updateComplete;
  await el.whenInitialized;
  await el.updateComplete;
  return { el, api, siblings };
}

describe('default location config editor', () => {
  it('shows the stored coordinates in the manual input', async () => {
    const { el } = await editor({ value: '52.379189,4.899431' });

    const input = el.shadowRoot!.querySelector<HTMLInputElement>('#coordinates');
    expect(input!.value).to.equal('52.379189,4.899431');
  });

  it('creates the map centred on the stored coordinates', async () => {
    const { api } = await editor({ value: '52.379189,4.899431' });

    expect(api.lastMap!.center).to.deep.equal({ lat: 52.379189, lng: 4.899431 });
  });

  it('updates the value as the map is panned', async () => {
    const { el, api } = await editor({ value: '52.379189,4.899431' });

    api.lastMap!.center = { lat: 51.5, lng: -0.12 };
    api.lastMap!.emit('center_changed');
    await el.updateComplete;

    expect(el.value).to.equal('51.5,-0.12');
  });

  it('notifies the host when the map is panned', async () => {
    const { el, api } = await editor({ value: '52.379189,4.899431' });
    let changes = 0;
    el.addEventListener('change', () => changes++);

    api.lastMap!.center = { lat: 51.5, lng: -0.12 };
    api.lastMap!.emit('center_changed');
    await el.updateComplete;

    expect(changes).to.equal(1);
  });

  it('writes the new zoom level to the sibling zoom configuration', async () => {
    const { el, api, siblings } = await editor({ value: '52.379189,4.899431' });

    api.lastMap!.zoom = 9;
    api.lastMap!.emit('zoom_changed');
    await el.updateComplete;

    expect(siblings.lastWriteTo('zoom')).to.equal(9);
  });

  it('follows the zoom field when it is edited elsewhere', async () => {
    const { el, api, siblings } = await editor({ value: '52.379189,4.899431' });

    siblings.emit('zoom', 5);
    await el.updateComplete;

    expect(api.lastMap!.zoom).to.equal(5);
  });

  it('opens at a zoom level an older version stored as text', async () => {
    const { api } = await editor({ value: '52.379189,4.899431', siblings: { zoom: '9' } });

    expect(api.lastMap!.zoom).to.equal(9);
  });

  it('re-centres the map on typed coordinates', async () => {
    const { el, api } = await editor({ value: '52.379189,4.899431' });

    el.applyCoordinates('48.8584,2.2945');
    await el.updateComplete;

    expect(api.lastMap!.center).to.deep.equal({ lat: 48.8584, lng: 2.2945 });
  });

  it('ignores text that is not a coordinate pair', async () => {
    const { el } = await editor({ value: '52.379189,4.899431' });

    el.applyCoordinates('Paris, France');
    await el.updateComplete;

    expect(el.value).to.equal('52.379189,4.899431');
  });

  it('normalises the spacing of typed coordinates', async () => {
    const { el } = await editor({ value: '52.379189,4.899431' });

    el.applyCoordinates('  48.8584,  2.2945 ');
    await el.updateComplete;

    expect(el.value).to.equal('48.8584,2.2945');
  });


  it('does not attempt a map without an api key', async () => {
    const { api } = await editor({ siblings: { apikey: undefined } });

    expect(api.lastMap === undefined).to.equal(true);
  });

  it('says why the map is missing when there is no api key', async () => {
    const { el } = await editor({ siblings: { apikey: undefined } });

    expect(el.shadowRoot!.textContent).to.contain('API key');
  });

  it('clears the stored location so the site default applies again', async () => {
    const { el } = await editor({ value: '52.379189,4.899431' });

    el.clear();
    await el.updateComplete;

    expect(el.value).to.equal(undefined);
  });

  it('notifies the host when the location is cleared', async () => {
    const { el } = await editor({ value: '52.379189,4.899431' });
    let changes = 0;
    el.addEventListener('change', () => changes++);

    el.clear();
    await el.updateComplete;

    expect(changes).to.equal(1);
  });

  it('borrows the api key from appsettings when the datatype has none', async () => {
    const { api } = await editor({
      value: '52.379189,4.899431',
      siblings: { apikey: undefined },
      site: { apiKey: 'appsettings-key' },
    });

    expect(api.configuredKey).to.equal('appsettings-key');
  });

  it('prefers the datatype api key over the appsettings one', async () => {
    const { api } = await editor({
      value: '52.379189,4.899431',
      site: { apiKey: 'appsettings-key' },
    });

    expect(api.configuredKey).to.equal('test-key');
  });

  it('opens at the appsettings default when the datatype has no location', async () => {
    const { api } = await editor({ site: { defaultLocation: '48.8584,2.2945' } });

    expect(api.lastMap!.center).to.deep.equal({ lat: 48.8584, lng: 2.2945 });
  });

  it('opens at the appsettings zoom level when the datatype has none', async () => {
    const { api } = await editor({
      value: '52.379189,4.899431',
      siblings: { zoom: undefined },
      site: { zoomLevel: 8 },
    });

    expect(api.lastMap!.zoom).to.equal(8);
  });

  /** Mimics the SDK handing over a place the user picked from the search box. */
  function selectPlace(el: GmapsDefaultLocationConfigElement, lat: number, lng: number) {
    const box = el.shadowRoot!.getElementById('search')!.firstElementChild as HTMLElement;
    const event = new Event('gmp-select');
    (event as unknown as { placePrediction: unknown }).placePrediction = {
      toPlace: () => ({
        location: { lat: () => lat, lng: () => lng },
        fetchFields: async () => undefined,
      }),
    };
    box.dispatchEvent(event);
  }

  it('mounts a place search box on the map', async () => {
    const { el } = await editor({ value: '52.379189,4.899431' });

    const box = el.shadowRoot!.getElementById('search');
    expect(box!.childElementCount).to.equal(1);
  });

  it('centres on the place picked from the search box', async () => {
    const { el } = await editor({ value: '52.379189,4.899431' });

    selectPlace(el, -37.8179, 144.9691);
    await aTimeout(50);
    await el.updateComplete;

    expect(el.value).to.equal('-37.8179,144.9691');
  });

  it('hints at ctrl + drag when the map refuses a drag', async () => {
    const { el, api } = await editor({ value: '52.379189,4.899431' });

    api.lastMap!.emit('dragstart');
    api.lastMap!.emit('drag');
    await el.updateComplete;

    const overlay = el.shadowRoot!.getElementById('ctrlScrollOverlay');
    expect(overlay!.classList.contains('visible')).to.equal(true);
  });
});
