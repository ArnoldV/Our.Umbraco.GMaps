import { expect } from '@open-wc/testing';
import { describeGeocoderStatus, statusFromError } from './geocode-status.js';

describe('core/geocode-status', () => {
  it('treats ZERO_RESULTS as information, not an error', () => {
    const notice = describeGeocoderStatus('ZERO_RESULTS', '"Nowhere"');

    expect(notice.severity).to.equal('info');
    expect(notice.message).to.equal('No location found for "Nowhere".');
  });

  it('explains REQUEST_DENIED as a key/API configuration problem', () => {
    const notice = describeGeocoderStatus('REQUEST_DENIED', '"anywhere"');

    expect(notice.severity).to.equal('error');
    expect(notice.message).to.contain('Geocoding API');
  });

  it('explains OVER_QUERY_LIMIT as a quota problem', () => {
    const notice = describeGeocoderStatus('OVER_QUERY_LIMIT', '"anywhere"');

    expect(notice.severity).to.equal('error');
    expect(notice.message).to.contain('quota');
  });

  it('names the subject when Google rejects the request as invalid', () => {
    expect(describeGeocoderStatus('INVALID_REQUEST', '"anywhere"').message).to.contain(
      '"anywhere"',
    );
  });

  it('reports ERROR and UNKNOWN_ERROR as a connectivity problem', () => {
    for (const status of ['ERROR', 'UNKNOWN_ERROR']) {
      expect(describeGeocoderStatus(status, '"anywhere"').message).to.contain('Could not reach');
    }
  });

  it('includes an unrecognised status in the fallback message', () => {
    expect(describeGeocoderStatus('SOMETHING_NEW', '"anywhere"').message).to.contain(
      '(SOMETHING_NEW)',
    );
  });

  it('omits the parenthetical when there is no status at all', () => {
    expect(describeGeocoderStatus(undefined, '"anywhere"').message).to.not.contain('(');
  });

  it('recovers a status from an Error message', () => {
    expect(statusFromError(new Error('Geocoding failed: REQUEST_DENIED'))).to.equal(
      'REQUEST_DENIED',
    );
  });

  it('prefers UNKNOWN_ERROR over the ERROR substring it contains', () => {
    expect(statusFromError(new Error('UNKNOWN_ERROR'))).to.equal('UNKNOWN_ERROR');
  });

  it('returns undefined when no known status appears', () => {
    expect(statusFromError(new Error('something else went wrong'))).to.equal(undefined);
    expect(statusFromError(undefined)).to.equal(undefined);
  });
});
