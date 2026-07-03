import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { classifyCivicIssue } from "../../src/core/classify.js";
import { formatClassifySummary } from "../../src/tools/classify_civic_issue.js";
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
    assert.ok(!output.safety.masked_description.includes("확인 필요이니"));
    assert.ok(!output.safety.masked_description.includes("신고문 써줘"));
    assert.ok(output.safety.forbidden_claims_removed.includes("forbidden_phrase"));
    assert.ok(output.safety.forbidden_claims_removed.includes("forbidden_pattern"));
    assert.ok(output.errors.some((error) => error.code === "E_FORBIDDEN_ASSERTION_REMOVED"));
  });

  it("routes personal neighbor-help requests to explicit out-of-scope roadmap messaging", () => {
    const output = classifyCivicIssue({
      description: "당근에서처럼 병원 동행 도와줄 사람을 동네에서 찾고 싶어요."
    });
    assert.equal(output.result_type, "out_of_scope");
    assert.equal(output.issue.code, "OUT_OF_SCOPE");
    assert.equal(output.draft_policy.can_draft, false);
    assert.match(output.draft_policy.reason, /로드맵/);
    assert.match(output.user_messages.summary, /범위/);
    assert.match(output.answer_markdown, /정확한 주소·동호수·현관 비밀번호/);
    assert.match(output.answer_markdown, /플랫폼 메시지/);
    assert.match(output.answer_markdown, /자동 매칭·연락·게시를 하지 않습니다/);
    assert.ok(output.errors.some((error) => error.code === "E_NEIGHBOR_HELP_UNSUPPORTED"));
  });

  it("returns source-backed action guidance for vehicle-related public-sharing risk", () => {
    const output = classifyCivicIssue({
      description: "OO초 앞 횡단보도 입구에 12가3456 차량이 불법주정차로 계속 서 있어요. 사진엔 아이들 얼굴도 보여서 동네방에 올려도 될지 모르겠어요."
    });

    assert.equal(output.result_type, "classification");
    assert.equal(output.issue.code, "ILLEGAL_PARKING_SAFETY");
    assert.ok(output.source_basis.source_card_count >= 13);
    assert.ok(output.source_basis.matched_cards.some((card) => card.source_id === "safetyreport_illegal_parking_basic"));
    assert.ok(output.source_basis.matched_cards.some((card) => card.source_id === "pipc_vehicle_plate_personal_info"));
    assert.match(output.action_card.official_domain, /안전신문고|불법 주정차/);
    assert.ok(output.action_card.official_routes.some((route) => route.label === "안전신문고" && route.url?.startsWith("https://")));
    assert.ok(output.action_card.official_routes.some((route) => route.label === "국민신문고 일반민원" && route.url?.startsWith("https://")));
    assert.ok(output.action_card.official_routes.some((route) => route.label.includes("지역/구청") && route.url === null));
    assert.ok(output.action_card.legal_context.some((context) => context.source_id === "pipc_vehicle_plate_personal_info"));
    assert.ok(output.action_card.evidence_now.some((item) => /차량번호|사진|촬영/.test(item)));
    assert.ok(output.action_card.do_not_share.some((item) => /차량번호|아동|얼굴/.test(item)));
    assert.ok(!output.safety.masked_description.includes("12가3456"));
    assert.match(output.answer_markdown, /https:\/\/www\.mois\.go\.kr/);
    assert.match(output.answer_markdown, /차량번호는 공식 신고용 사실관계/);
  });

  it("formats captured PlayMCP classification as action guidance, not classifier jargon", () => {
    const output = classifyCivicIssue({
      description: "OO초 앞 횡단보도 입구에 차량이 불법주정차로 계속 서 있어요. 사진엔 아이들 얼굴도 보여서 동네방에 올려도 될지 모르겠어요."
    });
    const summary = formatClassifySummary(output);

    assert.doesNotMatch(summary, /분류되었습니다|분류됩니다/);
    assert.match(summary, /안전신문고/);
    assert.match(summary, /국민신문고/);
    assert.match(summary, /지역\/구청 공식 생활민원 페이지 직접 선택/);
    assert.match(summary, /https:\/\/www\.mois\.go\.kr/);
    assert.match(summary, /아이|얼굴|차량번호/);
  });
});
