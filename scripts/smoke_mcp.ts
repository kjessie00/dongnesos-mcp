import assert from "node:assert/strict";

import { classifyCivicIssue } from "../src/core/classify.js";
import { draftCivicReport } from "../src/core/draft.js";

const classification = classifyCivicIssue({
  description: "집 앞 보도블록이 깨져서 유모차가 걸려요.",
  where_hint: "○○초등학교 정문 앞"
});

assert.equal(classification.ok, true);
assert.equal(classification.result_type, "classification");
assert.equal(classification.issue.code, "ROAD_SIDEWALK_DAMAGE");
assert.equal(classification.draft_policy.can_draft, true);

const draft = draftCivicReport({
  issue_code: classification.issue.code,
  facts: {
    what: "보도블록 일부가 깨지고 들떠 있어 보행 시 발이 걸릴 위험이 있습니다.",
    where_general: "○○초등학교 정문 앞 보도",
    when_observed: "2026-06-21 저녁",
    impact: "유모차와 보행자가 지나갈 때 걸릴 수 있어 보행 안전이 우려됩니다."
  }
});

assert.equal(draft.ok, true);
assert.equal(draft.result_type, "draft");
assert.ok(draft.draft?.copy_block.includes("신고 준비용 초안"));

const emergency = classifyCivicIssue({ description: "복도에서 가스 냄새가 심하게 나요." });
assert.equal(emergency.result_type, "emergency_redirect");
assert.equal(emergency.draft_policy.can_draft, false);

console.log("Core smoke OK");
