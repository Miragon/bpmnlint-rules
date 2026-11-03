import { describe, expect, it } from 'vitest';

import { diagram, geometry, naming } from '../../src';

describe('public toolkit namespaces', () => {
  it('expose a stable set of names', () => {
    expect({
      diagram: Object.keys(diagram).sort(),
      geometry: Object.keys(geometry).sort(),
      naming: Object.keys(naming).sort(),
    }).toMatchSnapshot();
  });
});
