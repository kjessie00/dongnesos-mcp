import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { draftCivicReport } from "../../src/core/draft.js";

describe("draftCivicReport", () => {
  it("creates a neutral report preparation draft", () => {
    const output = draftCivicReport({
      issue_code: "ROAD_SIDEWALK_DAMAGE",
      facts: {
        what: "보도블록이 깨져서 유모차가 걸립니다.",
        where_general: "○○초등학교 정문 앞 보도",
        when_observed: "오늘 아침"
      }
    });
    assert.equal(output.result_type, "draft");
    assert.ok(output.draft?.copy_block.includes("신고 준비용 초안"));
    assert.ok(output.draft?.copy_block.includes("실제 접수는 사용자가 공식 채널에서 직접 진행"));
    assert.equal(output.draft?.copy_block.startsWith(`${output.draft.title}\n\n${output.draft.title}`), false);
  });

  it("blocks emergency drafts", () => {
    const output = draftCivicReport({
      issue_code: "EMERGENCY_GAS",
      facts: {
        what: "복도에서 가스 냄새가 심하게 나요."
      }
    });
    assert.equal(output.result_type, "blocked_emergency");
    assert.equal(output.draft, null);
  });

  it("masks PII and neutralizes legal claims", () => {
    const output = draftCivicReport({
      issue_code: "ILLEGAL_PARKING_SAFETY",
      facts: {
        what: "12가3456 차가 불법 확정이라 처벌해 주세요.",
        where_general: "소화전 앞"
      }
    });
    assert.equal(output.result_type, "draft");
    assert.equal(output.safety.pii_detected, true);
    assert.ok(!output.draft?.copy_block.includes("12가3456"));
    assert.ok(!output.draft?.copy_block.includes("처벌해"));
    assert.ok(!output.draft?.copy_block.includes("불법 확정"));
  });

  it("does not block a streetlight draft for general crime anxiety in impact", () => {
    const output = draftCivicReport({
      issue_code: "STREETLIGHT_OUT",
      facts: {
        what: "가로등이 꺼져 있습니다.",
        where_general: "아파트 후문 앞 골목",
        impact: "야간 보행 안전과 범죄 불안이 우려됩니다."
      }
    });
    assert.equal(output.result_type, "draft");
    assert.equal(output.draft?.copy_block.includes("범죄 불안"), true);
  });

  it("still blocks direct police emergencies in draft facts", () => {
    const output = draftCivicReport({
      issue_code: "STREETLIGHT_OUT",
      facts: {
        what: "흉기를 든 사람이 골목에서 위협하고 있어요.",
        where_general: "아파트 후문 앞 골목"
      }
    });
    assert.equal(output.result_type, "blocked_emergency");
    assert.equal(output.draft, null);
  });

  it("masks apartment unit addresses before vehicle plate patterns", () => {
    const output = draftCivicReport({
      issue_code: "ILLEGAL_DUMPING",
      facts: {
        what: "쓰레기가 우리집 101동 1203호 앞에 반복적으로 쌓입니다.",
        where_general: "아파트 분리수거장 옆"
      }
    });
    assert.equal(output.result_type, "draft");
    assert.ok(output.draft?.copy_block.includes("[동호수 비공개]"));
    assert.ok(!output.draft?.copy_block.includes("[차량정보 비공개]호"));
    assert.deepEqual(output.safety.masked_fields, ["unit_address"]);
  });
});
