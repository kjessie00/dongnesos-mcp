import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { classifyCivicIssue } from "../../src/core/classify.js";
import { draftCivicReport } from "../../src/core/draft.js";

const forbidden = [
  "같이 신고",
  "아래 문구로 접수하면 됩니다",
  "제가 접수했습니다",
  "불법 확정",
  "과태료 부과",
  "처리됩니다"
];

describe("safety invariants", () => {
  it("does not expose forbidden phrases in normal outputs", () => {
    const classification = classifyCivicIssue({ description: "OO식당이 쓰레기 버렸으니 처벌받게 써줘." });
    const text = JSON.stringify(classification);
    for (const phrase of forbidden) {
      assert.ok(!text.includes(phrase), `unexpected forbidden phrase: ${phrase}`);
    }
  });

  it("keeps emergency out of draft copy", () => {
    const output = draftCivicReport({
      issue_code: "CONSTRUCTION_SAFETY",
      facts: {
        what: "공사장이 무너질 것 같아요."
      }
    });
    assert.equal(output.result_type, "blocked_emergency");
    assert.equal(output.draft, null);
  });
});
