import { expect } from '@open-wc/testing';
import { MapsKeyArbiter } from './maps-key-arbiter.js';

/** An arbiter that records what it was asked to load instead of calling Google. */
function arbiter() {
  const loaded: string[] = [];
  const teardowns: number[] = [];
  const subject = new MapsKeyArbiter({
    load: async (key) => { loaded.push(key); },
    teardown: () => { teardowns.push(1); },
  });
  return { subject, loaded, teardowns };
}

describe('maps/maps-key-arbiter', () => {
  it('prefers a datatype key over the appsettings one offered first', async () => {
    const { subject } = arbiter();
    subject.offer('appsettings-key', 'appsettings');
    subject.offer('datatype-key', 'datatype');

    expect(await subject.load()).to.equal('datatype-key');
  });

  it('prefers a datatype key over an appsettings one offered later', async () => {
    const { subject } = arbiter();
    subject.offer('datatype-key', 'datatype');
    subject.offer('appsettings-key', 'appsettings');

    expect(await subject.load()).to.equal('datatype-key');
  });

  it('keeps the first of two datatype keys', async () => {
    const { subject } = arbiter();
    subject.offer('first-key', 'datatype');
    subject.offer('second-key', 'datatype');

    expect(await subject.load()).to.equal('first-key');
  });

  it('loads the api only once however many editors ask', async () => {
    const { subject, loaded } = arbiter();
    subject.offer('a-key', 'datatype');

    await Promise.all([subject.load(), subject.load(), subject.load()]);

    expect(loaded).to.deep.equal(['a-key']);
  });

  it('ignores a key offered after the api has loaded', async () => {
    const { subject } = arbiter();
    subject.offer('first-key', 'datatype');
    await subject.load();

    subject.offer('late-key', 'datatype');

    expect(await subject.load()).to.equal('first-key');
  });

  it('never tears the api down for an editor that merely wants another key', async () => {
    const { subject, teardowns } = arbiter();
    subject.offer('first-key', 'datatype');
    await subject.load();

    subject.offer('other-key', 'datatype');
    await subject.load();

    expect(teardowns).to.have.length(0);
  });

  it('reports the key in use so an editor can tell it did not get its own', async () => {
    const { subject } = arbiter();
    subject.offer('appsettings-key', 'appsettings');
    subject.offer('datatype-key', 'datatype');
    await subject.load();

    expect(subject.activeKey).to.equal('datatype-key');
  });

  it('tears the api down when a key is deliberately replaced', async () => {
    const { subject, loaded, teardowns } = arbiter();
    subject.offer('first-key', 'datatype');
    await subject.load();

    await subject.reload('corrected-key');

    expect(teardowns).to.have.length(1);
    expect(loaded).to.deep.equal(['first-key', 'corrected-key']);
  });

  it('serves the replaced key to everyone once it is loaded', async () => {
    const { subject } = arbiter();
    subject.offer('first-key', 'datatype');
    await subject.load();
    await subject.reload('corrected-key');

    expect(await subject.load()).to.equal('corrected-key');
  });

  it('ignores an editor that has no key to offer', async () => {
    const { subject } = arbiter();
    subject.offer('', 'datatype');
    subject.offer('appsettings-key', 'appsettings');

    expect(await subject.load()).to.equal('appsettings-key');
  });
});
