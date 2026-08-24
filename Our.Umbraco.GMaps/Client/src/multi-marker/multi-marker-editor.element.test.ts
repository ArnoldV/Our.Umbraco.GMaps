/// <reference types='@types/google.maps' />
import { aTimeout, expect, fixture, html } from '@open-wc/testing';
import './multi-marker-editor.element.js';
import type GMapsMultiMarkerEditorElement from './multi-marker-editor.element.js';
import { FakeMapsApi } from '../maps/fake-maps-api.js';
import type { FakeMap } from '../maps/fake-maps-api.js';
import type { MultiMap } from '../types.js';
import { DEFAULT_PIN_BACKGROUND } from '../core/marker-pin.js';

/** A stand-in for UmbPropertyEditorConfigCollection: only getValueByAlias is used. */
function config(values: Record<string, unknown>) {
  return {
    getValueByAlias: <T>(alias: string) => values[alias] as T,
  } as never;
}

async function editor(options: { value?: MultiMap; config?: Record<string, unknown> } = {}) {
  const api = new FakeMapsApi();
  const el = await fixture<GMapsMultiMarkerEditorElement>(
    html`<gmaps-multi-marker></gmaps-multi-marker>`,
  );
  el.api = api;
  el.config = config({ apikey: 'test-key', zoom: 12, maptype: 'roadmap', ...(options.config ?? {}) });
  el.value = options.value;
  await el.updateComplete;
  await el.whenInitialized;
  await el.updateComplete;
  return { el, api };
}

const markerValue = (count: number): MultiMap => ({
  markers: Array.from({ length: count }, (_, i) => ({
    key: `k${i}`,
    friendlyName: `Marker ${i}`,
    coordinates: { lat: i, lng: i },
  })),
  mapconfig: { zoom: 12, maptype: 'roadmap', centerCoordinates: { lat: 0, lng: 0 } },
});

describe('multi-marker editor', () => {
  it('creates the map through the injected api', async () => {
    const { api } = await editor();

    expect(api.configuredKey).to.equal('test-key');
    expect(api.lastMap).to.not.equal(undefined);
  });

  it('renders one chip per stored marker', async () => {
    const { el } = await editor({ value: markerValue(3) });

    expect(el.shadowRoot!.querySelectorAll('.chip:not(.add)')).to.have.length(3);
  });

  it('shows the marker count against the maximum', async () => {
    const { el } = await editor({ value: markerValue(2), config: { maxNumber: 10 } });

    expect(el.shadowRoot!.textContent).to.contain('2 of 10');
  });

  it('shows just the count when unlimited', async () => {
    const { el } = await editor({ value: markerValue(2), config: { maxNumber: 0 } });

    expect(el.shadowRoot!.textContent).to.contain('2 markers');
  });

  it('adds a marker at the map centre', async () => {
    const { el } = await editor({ value: markerValue(1) });
    el.addMarkerAtCentre();
    await el.updateComplete;

    expect(el.value!.markers).to.have.length(2);
  });

  it('refuses to add beyond the maximum', async () => {
    const { el } = await editor({ value: markerValue(2), config: { maxNumber: 2 } });
    el.addMarkerAtCentre();
    await el.updateComplete;

    expect(el.value!.markers).to.have.length(2);
  });

  it('disables the add affordance at the maximum', async () => {
    const { el } = await editor({ value: markerValue(2), config: { maxNumber: 2 } });
    const add = el.shadowRoot!.querySelector('#add-marker') as HTMLButtonElement;

    expect(add.disabled).to.equal(true);
  });

  it('removes a marker by key', async () => {
    const { el } = await editor({ value: markerValue(3) });
    el.removeMarker('k1');
    await el.updateComplete;

    expect(el.value!.markers.map((m) => m.key)).to.deep.equal(['k0', 'k2']);
  });

  it('reorders markers and keeps the new order in the value', async () => {
    const { el } = await editor({ value: markerValue(3) });
    el.reorder(['k2', 'k0', 'k1']);
    await el.updateComplete;

    expect(el.value!.markers.map((m) => m.key)).to.deep.equal(['k2', 'k0', 'k1']);
  });

  it('applies an edited marker from the drawer', async () => {
    const { el } = await editor({ value: markerValue(2) });
    el.applyMarkerEdit({ key: 'k1', friendlyName: 'Renamed', coordinates: { lat: 1, lng: 1 } });
    await el.updateComplete;

    expect(el.value!.markers[1].friendlyName).to.equal('Renamed');
    expect(el.value!.markers[0].friendlyName).to.equal('Marker 0');
  });

  it('reads a legacy single-map value as one marker', async () => {
    const legacy = {
      address: { friendlyName: 'HQ', coordinates: { lat: 1, lng: 2 } },
      mapconfig: { zoom: 15, maptype: 'roadmap' },
    } as never;
    const { el } = await editor({ value: legacy });

    expect(el.markersForTests).to.have.length(1);
    expect(el.markersForTests[0].friendlyName).to.equal('HQ');
  });

  it('dispatches change when markers change', async () => {
    const { el } = await editor({ value: markerValue(1) });
    let changes = 0;
    el.addEventListener('change', () => { changes++; });

    el.addMarkerAtCentre();
    await el.updateComplete;

    expect(changes).to.be.greaterThan(0);
  });

  it('does not dispatch change merely from loading a value', async () => {
    const api = new FakeMapsApi();
    const el = await fixture<GMapsMultiMarkerEditorElement>(
      html`<gmaps-multi-marker></gmaps-multi-marker>`,
    );
    let changes = 0;
    el.addEventListener('change', () => { changes++; });
    el.api = api;
    el.config = config({ apikey: 'test-key', zoom: 12, maptype: 'roadmap' });
    el.value = markerValue(2);
    await el.updateComplete;
    await el.whenInitialized;
    await el.updateComplete;

    expect(changes).to.equal(0);
  });

  it('does not dispatch change when the map re-reports the centre it already had', async () => {
    const { el, api } = await editor({ value: markerValue(2) });
    let changes = 0;
    el.addEventListener('change', () => { changes++; });

    (api.lastMap as FakeMap).emit('center_changed');
    await el.updateComplete;

    expect(changes).to.equal(0);
  });

  it('frames all markers on load when nothing framed them before', async () => {
    const value = markerValue(3);
    value.mapconfig.centerCoordinates = undefined;
    const { api } = await editor({ value });

    expect((api.lastMap as FakeMap).fitBoundsCalls).to.have.length(1);
  });

  it('honours a stored centre instead of framing the markers', async () => {
    const { api } = await editor({ value: markerValue(3) });

    expect((api.lastMap as FakeMap).fitBoundsCalls).to.have.length(0);
    expect((api.lastMap as FakeMap).center).to.deep.equal({ lat: 0, lng: 0 });
  });

  it('warns when min exceeds max and treats both as unlimited', async () => {
    const { el } = await editor({ value: markerValue(3), config: { minNumber: 5, maxNumber: 2 } });

    expect(el.shadowRoot!.textContent).to.contain('misconfigured');
    el.addMarkerAtCentre();
    await el.updateComplete;
    expect(el.value!.markers).to.have.length(4);
  });

  it('is invalid below the minimum', async () => {
    const { el } = await editor({ value: markerValue(1), config: { minNumber: 3 } });

    expect(el.checkValidity()).to.equal(false);
  });

  it('is valid at or above the minimum', async () => {
    const { el } = await editor({ value: markerValue(3), config: { minNumber: 3 } });

    expect(el.checkValidity()).to.equal(true);
  });

  it('clicking the map adds a marker there', async () => {
    const { el, api } = await editor({ value: markerValue(1) });
    (api.lastMap as FakeMap).emit('click', {
      latLng: { lat: () => 51.5, lng: () => -0.12 },
    });
    await el.updateComplete;

    expect(el.markersForTests).to.have.length(2);
    expect(el.markersForTests[1].coordinates).to.deep.equal({ lat: 51.5, lng: -0.12 });
  });

  it('resetView restores the markers the document was loaded with', async () => {
    const { el } = await editor({ value: markerValue(2) });
    el.removeMarker('k0');
    await el.updateComplete;
    expect(el.markersForTests).to.have.length(1);

    el.resetView();
    await el.updateComplete;

    expect(el.markersForTests.map((m) => m.key)).to.deep.equal(['k0', 'k1']);
  });
});

describe('multi-marker editor: chip sorting', () => {
  it('wires a sorter over the chips whose model matches the markers', async () => {
    const { el } = await editor({ value: markerValue(3) });

    expect(el.sorterForTests).to.not.equal(undefined);
    expect(el.sorterForTests.getModel().map((m) => m.key)).to.deep.equal(['k0', 'k1', 'k2']);
  });

  it('writes a sorter-reported order into the value', async () => {
    const { el } = await editor({ value: markerValue(3) });
    el.reorder(['k2', 'k0', 'k1']);
    await el.updateComplete;

    expect(el.value!.markers.map((m) => m.key)).to.deep.equal(['k2', 'k0', 'k1']);
  });

  it('keeps the sorter model in step after a reorder', async () => {
    const { el } = await editor({ value: markerValue(3) });
    el.reorder(['k2', 'k0', 'k1']);
    await el.updateComplete;

    expect(el.sorterForTests.getModel().map((m) => m.key)).to.deep.equal(['k2', 'k0', 'k1']);
  });

  it('keeps the sorter model in step after a removal', async () => {
    const { el } = await editor({ value: markerValue(3) });
    el.removeMarker('k1');
    await el.updateComplete;

    expect(el.sorterForTests.getModel().map((m) => m.key)).to.deep.equal(['k0', 'k2']);
  });
});

describe('multi-marker editor: geocoding notices', () => {
  it('reports why a lookup failed instead of silently dropping the address', async () => {
    const { el, api } = await editor({ value: markerValue(0) });
    api.queueGeocodeOutcomes({ status: 'REQUEST_DENIED' });

    el.addMarkerAtCentre();
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 50));
    await el.updateComplete;

    const notice = el.shadowRoot!.querySelector('.notice');
    expect(notice).to.not.equal(null);
    expect(notice!.textContent).to.contain('Geocoding API');
  });

  it('clears the notice once a lookup succeeds', async () => {
    const { el, api } = await editor({ value: markerValue(0) });
    api.queueGeocodeOutcomes(
      { status: 'REQUEST_DENIED' },
      {
        results: [
          {
            formatted_address: '350 Bourke St, Melbourne',
            geometry: { location: { lat: () => 1, lng: () => 2 } },
            address_components: [],
          } as unknown as google.maps.GeocoderResult,
        ],
        status: 'OK',
      },
    );

    el.addMarkerAtCentre();
    await new Promise((r) => setTimeout(r, 50));
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.notice')).to.not.equal(null);

    el.addMarkerAtCentre();
    await new Promise((r) => setTimeout(r, 50));
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.notice')).to.equal(null);
  });
});

describe('multi-marker editor: coordinate entry', () => {
  /** Mirrors the real component: the typed text lives on `.value`, and the
   *  actual <input> sits below a nested shadow root that composedPath() misses. */
  function typeCoordinatesAndEnter(el: GMapsMultiMarkerEditorElement, text: string) {
    const ac = el.shadowRoot!.querySelector('#place-autocomplete-container')!
      .firstElementChild as HTMLElement & { value?: string };
    ac.value = text;
    ac.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
  }

  it('adds a marker from coordinates typed into the search box', async () => {
    const { el } = await editor({ value: markerValue(0) });

    typeCoordinatesAndEnter(el, '-37.8136,144.9631');
    await new Promise((r) => setTimeout(r, 50));
    await el.updateComplete;

    expect(el.markersForTests).to.have.length(1);
    expect(el.markersForTests[0].coordinates).to.deep.equal({ lat: -37.8136, lng: 144.9631 });
  });

  it('ignores Enter on text that is not coordinates', async () => {
    const { el } = await editor({ value: markerValue(0) });

    typeCoordinatesAndEnter(el, 'Paris, France');
    await new Promise((r) => setTimeout(r, 50));
    await el.updateComplete;

    expect(el.markersForTests).to.have.length(0);
  });
});

describe('multi-marker editor: numbered pins', () => {
  /** Pin creation is async and fired off with void, so let it settle. */
  const settle = async (el: GMapsMultiMarkerEditorElement) => {
    await el.updateComplete;
    await aTimeout(0);
  };

  const glyphs = (api: FakeMapsApi) =>
    api.markers.map((m) => (m.content as HTMLElement | null)?.dataset.glyph);

  it('numbers the pins from one, in list order', async () => {
    const { api } = await editor({ value: markerValue(3) });

    expect(glyphs(api)).to.eql(['1', '2', '3']);
  });

  it("draws each pin in its marker's own colour", async () => {
    const value = markerValue(2);
    value.markers[1].color = '#2d7ef7';
    const { api } = await editor({ value });

    expect(api.pins[1].background).to.equal('#2d7ef7');
    expect(api.pins[1].glyphColor).to.equal('#ffffff');
  });

  it('gives an uncoloured marker the default pin colour rather than none', async () => {
    const { api } = await editor({ value: markerValue(1) });

    expect(api.pins[0].background).to.equal(DEFAULT_PIN_BACKGROUND);
  });

  it('renumbers the pins when the markers are reordered', async () => {
    const { el, api } = await editor({ value: markerValue(3) });
    el.reorder(['k2', 'k0', 'k1']);
    await settle(el);

    expect(el.markersForTests.map((m) => m.key)).to.eql(['k2', 'k0', 'k1']);
    expect(glyphs(api)).to.eql(['2', '3', '1']);
  });

  it('renumbers the pins that follow a removed marker', async () => {
    const { el, api } = await editor({ value: markerValue(3) });
    el.removeMarker('k0');
    await settle(el);

    expect(glyphs(api).slice(1)).to.eql(['1', '2']);
  });

  it('leaves an unchanged pin alone instead of rebuilding it', async () => {
    const { el, api } = await editor({ value: markerValue(2) });
    const drawn = api.pins.length;

    el.applyMarkerEdit({ key: 'k0', friendlyName: 'Marker 0' });
    await settle(el);

    expect(api.pins.length).to.equal(drawn);
  });

  it('redraws a pin when its colour changes', async () => {
    const { el, api } = await editor({ value: markerValue(2) });

    el.applyMarkerEdit({ key: 'k0', color: '#2fa84f' });
    await settle(el);

    expect(api.pins[api.pins.length - 1].background).to.equal('#2fa84f');
  });

  it('builds one element per marker even when adds overlap', async () => {
    const { el, api } = await editor();
    el.addMarkerAtCentre();
    el.addMarkerAtCentre();
    el.addMarkerAtCentre();
    await settle(el);
    await settle(el);

    expect(el.markersForTests).to.have.length(3);
    expect(api.markers).to.have.length(3);
    expect(glyphs(api)).to.eql(['1', '2', '3']);
  });

  it('titles the pin with its number and label, so hovering identifies it', async () => {
    const { api } = await editor({ value: markerValue(2) });

    expect(api.markers.map((m) => m.title)).to.eql(['1. Marker 0', '2. Marker 1']);
  });

  it('retitles the pin once reverse geocoding names the place', async () => {
    const { el, api } = await editor();
    api.queueGeocodeOutcomes({
      status: 'OK',
      results: [
        {
          formatted_address: '350 Bourke St, Melbourne',
          address_components: [],
        } as unknown as google.maps.GeocoderResult,
      ],
    });

    el.addMarkerAtCentre();
    await settle(el);
    await settle(el);

    expect(api.markers[0].title).to.equal('1. 350 Bourke St, Melbourne');
  });

  it('numbers the chips to match the pins', async () => {
    const { el } = await editor({ value: markerValue(3) });
    const indexes = [...el.shadowRoot!.querySelectorAll('.chip:not(.add) .index')].map(
      (n) => n.textContent?.trim(),
    );

    expect(indexes).to.eql(['1', '2', '3']);
  });

  it("colours the chip badge with the marker's colour", async () => {
    const value = markerValue(1);
    value.markers[0].color = '#2d7ef7';
    const { el } = await editor({ value });
    const badge = el.shadowRoot!.querySelector('.chip:not(.add) .index') as HTMLElement;

    expect(badge.style.background).to.equal('rgb(45, 126, 247)');
  });
});
