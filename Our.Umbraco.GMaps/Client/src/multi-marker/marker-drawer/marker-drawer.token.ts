import { UmbModalToken } from '@umbraco-cms/backoffice/modal';
import type { Marker, MarkerColor } from '../../types.js';

export interface GMapsMarkerDrawerData {
  marker: Marker;
  /** The datatype's palette. Empty means the colour control is hidden. */
  palette: MarkerColor[];
  enableDescription: boolean;
}

export type GMapsMarkerDrawerValue = Marker;

/**
 * Edits one marker in a right-hand sidebar so the map stays visible - the whole
 * reason this is a drawer rather than a dialog.
 */
export const GMAPS_MARKER_DRAWER_MODAL = new UmbModalToken<
  GMapsMarkerDrawerData,
  GMapsMarkerDrawerValue
>('GMaps.Modal.MarkerDrawer', {
  modal: {
    type: 'sidebar',
    size: 'small',
  },
});
