import { expect } from '@open-wc/testing';
import { composeAddress } from './address.js';
import type { GoogleAddressComponent } from './address.js';

const component = (types: string[], longText: string | null): GoogleAddressComponent => ({
  longText,
  shortText: longText,
  types,
});

const EMPTY = {
  full_address: '',
  streetNumber: '',
  street: '',
  postalcode: '',
  state: '',
  city: '',
  country: '',
};

describe('core/address', () => {
  it('returns undefined when given no components', () => {
    expect(composeAddress(undefined)).to.equal(undefined);
    expect(composeAddress(null)).to.equal(undefined);
  });

  it('returns empty strings when given an empty list', () => {
    expect(composeAddress([])).to.deep.equal(EMPTY);
  });

  it('composes a full address', () => {
    expect(
      composeAddress([
        component(['street_number'], '88'),
        component(['route'], 'Dock Rd'),
        component(['locality'], 'Port Melbourne'),
        component(['administrative_area_level_1'], 'Victoria'),
        component(['postal_code'], '3207'),
        component(['country'], 'Australia'),
      ]),
    ).to.deep.equal({
      full_address: '',
      streetNumber: '88',
      street: 'Dock Rd',
      postalcode: '3207',
      state: 'Victoria',
      city: 'Port Melbourne',
      country: 'Australia',
    });
  });

  it('maps street_address as well as route to street', () => {
    expect(composeAddress([component(['street_address'], '88 Dock Rd')])?.street).to.equal(
      '88 Dock Rd',
    );
  });

  it('maps every administrative_area_level to state, last one winning', () => {
    expect(
      composeAddress([
        component(['administrative_area_level_1'], 'Victoria'),
        component(['administrative_area_level_2'], 'Port Phillip'),
      ])?.state,
    ).to.equal('Port Phillip');
  });

  it('maps sublocality levels to city', () => {
    expect(composeAddress([component(['sublocality_level_1'], 'Docklands')])?.city).to.equal(
      'Docklands',
    );
  });

  it('only consults types[0]', () => {
    expect(composeAddress([component(['political', 'locality'], 'Nowhere')])?.city).to.equal('');
  });

  it('lets the last matching component win, with no precedence', () => {
    expect(
      composeAddress([
        component(['locality'], 'Locality'),
        component(['postal_town'], 'Postal Town'),
      ])?.city,
    ).to.equal('Postal Town');

    expect(
      composeAddress([
        component(['postal_town'], 'Postal Town'),
        component(['locality'], 'Locality'),
      ])?.city,
    ).to.equal('Locality');
  });

  it('substitutes an empty string for a null longText', () => {
    expect(composeAddress([component(['country'], null)])?.country).to.equal('');
  });

  it('ignores unrecognised component types', () => {
    expect(composeAddress([component(['plus_code'], 'ignored')])).to.deep.equal(EMPTY);
  });
});
