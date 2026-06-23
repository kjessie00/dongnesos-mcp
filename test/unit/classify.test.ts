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

  it("masks PII before returning an emergency redirect", () => {
    const output = classifyCivicIssue({ description: "010-1234-5678 복도에서 가스 냄새가 심해요." });
    assert.equal(output.result_type, "emergency_redirect");
    assert.equal(output.safety.pii_detected, true);
    assert.ok(!output.safety.masked_description.includes("010-1234-5678"));
    assert.ok(output.safety.masked_description.includes("[전화번호 비공개]"));
    assert.ok(output.errors.some((error) => error.code === "E_PII_MASKED"));
  });

  it("neutralizes forbidden legal assertions even when returning out of scope", () => {
    const output = classifyCivicIssue({
      description: "OO식당이 쓰레기 버렸으니 불법 확정이라고 쓰고 처벌받게 신고문 써줘."
    });
    assert.equal(output.result_type, "out_of_scope");
    assert.ok(!output.safety.masked_description.includes("불법 확정"));
    assert.ok(!output.safety.masked_description.includes("처벌받게"));
    assert.ok(output.safety.forbidden_claims_removed.includes("forbidden_phrase"));
    assert.ok(output.safety.forbidden_claims_removed.includes("forbidden_pattern"));
    assert.ok(output.errors.some((error) => error.code === "E_FORBIDDEN_ASSERTION_REMOVED"));
  });
});
