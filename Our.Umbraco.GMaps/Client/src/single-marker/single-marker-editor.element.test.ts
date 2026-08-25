import { expect, fixture, html } from '@open-wc/testing';
import './single-marker-editor.element.js';
import type GmapsSingleMarkerElement from './single-marker-editor.element.js';
import { FakeMapsApi } from '../maps/fake-maps-api.js';
import { FakeAuthFailure } from '../maps/fake-auth-failure.js';

/** A stand-in for UmbPropertyEditorConfigCollection: only getValueByAlias is used. */
function config(values: Record<string, unknown>) {
  return {
    getValueByAlias: <T>(alias: string) => values[alias] as T,
  } as never;
}

async function editor(
  options: {
    config?: Record<string, unknown>;
    site?: { apiKey?: string | null; defaultLocation?: string | null; zoomLevel?: number | null };
    /** The key the page has already loaded, when it is not this editor's own. */
    activeKey?: string;
  } = {},
) {
  const api = new FakeMapsApi();
  api.activeKey = options.activeKey;
  const auth = new FakeAuthFailure();
  const el = await fixture<GmapsSingleMarkerElement>(
    html`<gmaps-single-marker></gmaps-single-marker>`,
  );
  el.api = api;
  el.site = { getSettings: async () => options.site };
  el.authFailure = auth.subscribe;
  el.config = config({ apikey: 'test-key', zoom: 17, maptype: 'roadmap', ...(options.config ?? {}) });
  el.value = undefined;
  await el.updateComplete;
  await el.whenInitialized;
  await el.updateComplete;
  return { el, api, auth };
}

describe('single-marker editor: a rejected api key', () => {
  it('blames the datatype key when the datatype supplied it', async () => {
    const { el, auth } = await editor({ site: { apiKey: 'appsettings-key' } });

    auth.fail();
    await el.updateComplete;

    expect(el.shadowRoot!.textContent).to.contain('this datatype');
  });

  it('blames the site-wide key when appsettings supplied it', async () => {
    const { el, auth } = await editor({
      config: { apikey: undefined },
      site: { apiKey: 'appsettings-key' },
    });

    auth.fail();
    await el.updateComplete;

    expect(el.shadowRoot!.textContent).to.contain('GoogleMaps:ApiKey');
  });

  it('borrows the api key from appsettings when the datatype has none', async () => {
    const { api } = await editor({
      config: { apikey: undefined },
      site: { apiKey: 'appsettings-key' },
    });

    expect(api.configuredKey).to.equal('appsettings-key');
  });
});

describe('single-marker editor: a key another property already loaded', () => {
  it('explains that the page can only load one key', async () => {
    const { el } = await editor({ activeKey: 'another-editors-key' });

    expect(el.shadowRoot!.textContent).to.contain('one API key per page');
  });

  it('draws no map with a key the page did not load', async () => {
    const { api } = await editor({ activeKey: 'another-editors-key' });

    expect(api.maps).to.have.length(0);
  });

  it('does not blame a key the page never tried', async () => {
    const { el, auth } = await editor({ activeKey: 'another-editors-key' });

    auth.fail();
    await el.updateComplete;

    expect(el.shadowRoot!.textContent).to.not.contain('rejected');
  });

  it('says no key is configured when neither the datatype nor appsettings has one', async () => {
    const { el } = await editor({ config: { apikey: undefined }, activeKey: undefined });

    expect(el.shadowRoot!.textContent).to.contain('GoogleMaps:ApiKey');
  });

  it('draws no map without a key', async () => {
    const { api } = await editor({ config: { apikey: undefined }, activeKey: undefined });

    expect(api.maps).to.have.length(0);
  });
});
