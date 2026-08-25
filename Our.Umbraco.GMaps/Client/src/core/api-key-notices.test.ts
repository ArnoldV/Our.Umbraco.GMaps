import { expect } from '@open-wc/testing';
import { CONFLICTING_KEY_MESSAGE, describeRejectedKey, MISSING_KEY_MESSAGE } from './api-key-notices.js';

describe('core/api-key-notices', () => {
  it('points at the datatype when its own key was rejected', () => {
    const message = describeRejectedKey('datatype');

    expect(message).to.contain('this datatype');
    expect(message).to.not.contain('GoogleMaps:ApiKey');
  });

  it('points at appsettings when the site-wide key was rejected', () => {
    const message = describeRejectedKey('appsettings');

    expect(message).to.contain('GoogleMaps:ApiKey');
  });

  it('gives the same things to check whichever key was rejected', () => {
    for (const message of [describeRejectedKey('datatype'), describeRejectedKey('appsettings')]) {
      expect(message).to.contain('billing is enabled');
      expect(message).to.contain('HTTP referrer restrictions');
    }
  });

  it('names the setting to add when no key is configured at all', () => {
    expect(MISSING_KEY_MESSAGE).to.contain('GoogleMaps:ApiKey');
  });

  it('explains that a page can only load one key', () => {
    expect(CONFLICTING_KEY_MESSAGE).to.contain('one API key per page');
  });

  it('says a different key is already in use, not that this one was refused', () => {
    expect(CONFLICTING_KEY_MESSAGE).to.not.contain('rejected');
  });
});
