import { expect } from '@open-wc/testing';
import { MapSurfaceController } from './map-surface.controller.js';
import { FakeMapsApi } from '../maps/fake-maps-api.js';
import type { FakeMap } from '../maps/fake-maps-api.js';
import type { Location } from '../types.js';

describe('controllers/MapSurfaceController', () => {
  let api: FakeMapsApi;
  let controller: MapSurfaceController;
  let centers: Location[];
  let zooms: number[];
  let hints: number;
  let map: FakeMap;

  const options = () => ({
    center: { lat: -37.8136, lng: 144.9631 },
    zoom: 12,
    maptype: 'roadmap' as const,
    onCenterChanged: (center: Location) => {
      centers.push(center);
    },
    onZoomChanged: (zoom: number) => {
      zooms.push(zoom);
    },
    onCtrlHintNeeded: () => {
      hints++;
    },
  });

  beforeEach(async () => {
    api = new FakeMapsApi();
    controller = new MapSurfaceController(api);
    centers = [];
    zooms = [];
    hints = 0;
    await controller.create(document.createElement('div'), options());
    map = api.lastMap as FakeMap;
  });

  afterEach(() => {
    controller.destroy();
  });

  it('creates the map at the requested centre and zoom', () => {
    expect(map.center).to.deep.equal({ lat: -37.8136, lng: 144.9631 });
    expect(map.zoom).to.equal(12);
  });

  it('reports centre changes as plain coordinates', () => {
    map.setCenter({ lat: 1, lng: 2 });
    map.emit('center_changed');

    expect(centers).to.deep.equal([{ lat: 1, lng: 2 }]);
  });

  it('reports zoom changes', () => {
    map.setZoom(15);
    map.emit('zoom_changed');

    expect(zooms).to.deep.equal([15]);
  });

  it('snaps back and asks for the hint when dragged without a modifier', () => {
    map.emit('dragstart');
    map.setCenter({ lat: 99, lng: 99 });
    map.emit('drag');

    expect(map.center).to.deep.equal({ lat: -37.8136, lng: 144.9631 });
    expect(hints).to.equal(1);
  });

  it('allows the drag while ctrl is held', () => {
    globalThis.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control' }));
    map.emit('dragstart');
    map.setCenter({ lat: 99, lng: 99 });
    map.emit('drag');

    expect(map.center).to.deep.equal({ lat: 99, lng: 99 });
    expect(hints).to.equal(0);

    globalThis.dispatchEvent(new KeyboardEvent('keyup', { key: 'Control' }));
  });

  it('allows the drag while meta is held', () => {
    globalThis.dispatchEvent(new KeyboardEvent('keydown', { key: 'Meta' }));
    map.emit('dragstart');
    map.setCenter({ lat: 42, lng: 42 });
    map.emit('drag');

    expect(map.center).to.deep.equal({ lat: 42, lng: 42 });

    globalThis.dispatchEvent(new KeyboardEvent('keyup', { key: 'Meta' }));
  });

  it('stops listening for modifier keys once destroyed', () => {
    controller.destroy();
    globalThis.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control' }));

    map.emit('dragstart');
    map.setCenter({ lat: 99, lng: 99 });
    map.emit('drag');

    expect(map.center).to.deep.equal({ lat: -37.8136, lng: 144.9631 });
  });
});
