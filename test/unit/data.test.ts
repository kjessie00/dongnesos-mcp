import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { assertDataIsValid, taxonomyData } from "../../src/data/loadData.js";

describe("data", () => {
  it("has valid fixed taxonomy", () => {
    assertDataIsValid();
    assert.equal(taxonomyData.items.length, 28);
    assert.equal(taxonomyData.taxonomy_size, 28);
  });
});
