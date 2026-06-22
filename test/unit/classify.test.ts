import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { classifyCivicIssue } from "../../src/core/classify.js";
import demoFixtures from "../golden/demo.fixtures.json" with { type: "json" };
import safetyFixtures from "../golden/safety_edge.fixtures.json" with { type: "json" };

describe("classifyCivicIssue", () => {
  for (const fixture of [...demoFixtures, ...safetyFixtures]) {
    it(`${fixture.id} -> ${fixture.expected_issue_code}`, () => {
      const output = classifyCivicIssue({ description: fixture.description });
      assert.equal(output.result_type, fixture.expected_result_type);
      assert.equal(output.issue.code, fixture.expected_issue_code);
      if ("expect_pii" in fixture && fixture.expect_pii) {
        assert.equal(output.safety.pii_detected, true);
      }
    });
  }

  it("returns only safe routing language", () => {
    const output = classifyCivicIssue({ description: "보도블록이 깨졌어요." });
    assert.equal(output.routing.verify_needed, true);
    assert.match(output.routing.region_note, /확인 필요/);
  });
});
