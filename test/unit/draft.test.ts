import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { draftCivicReport } from "../../src/core/draft.js";
import { formatDraftSummary } from "../../src/tools/draft_civic_report.js";

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
    assert.match(output.draft?.copy_block ?? "", /^제목:/);
    assert.ok(output.draft?.copy_block.includes("실제 접수는 사용자가 공식 채널에서 직접 진행"));
    assert.equal(output.draft?.copy_block.startsWith(`${output.draft.title}\n\n${output.draft.title}`), false);
    assert.ok(output.official_routes.some((route) => route.label === "안전신문고"));
    assert.ok(output.official_routes.some((route) => route.label === "국민신문고 일반민원"));
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
    assert.ok(output.draft?.copy_block.includes("12가3456"));
    assert.ok(!output.draft?.copy_block.includes("확인이 필요한 생활불편 상황이 관찰되었습니다 계속"));
    assert.ok(!output.draft?.copy_block.includes("검토주세요"));
    assert.ok(!output.share.neighbor_text.includes("12가3456"));
    assert.ok(output.privacy_redactions.some((item) => item.includes("차량번호")));
    assert.ok(!output.draft?.copy_block.includes("처벌해"));
    assert.ok(!output.draft?.copy_block.includes("불법 확정"));
  });

  it("keeps illegal-parking category wording readable while removing legal assertions", () => {
    const output = draftCivicReport({
      issue_code: "ILLEGAL_PARKING_SAFETY",
      facts: {
        what: "12가3456 차량이 불법주정차로 계속 서 있습니다.",
        where_general: "OO초 앞 횡단보도 입구"
      }
    });
    assert.equal(output.result_type, "draft");
    assert.ok(output.draft?.copy_block.includes("불법주정차"));
    assert.ok(!output.draft?.copy_block.includes("확인이 필요한 생활불편 상황이 관찰되었습니다 계속"));
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

  it("keeps privacy placeholders out of draft titles", () => {
    const output = draftCivicReport({
      issue_code: "ILLEGAL_DUMPING",
      facts: {
        what: "쓰레기가 우리집 101동 1203호 앞에 반복적으로 쌓입니다.",
        where_general: "101동 1203호 앞"
      }
    });
    assert.equal(output.result_type, "draft");
    assert.ok(output.draft);
    assert.ok(!output.draft.title.includes("비공개"));
    assert.ok(!output.draft.title.includes("101동"));
    assert.ok(output.draft.copy_block.includes("[동호수 비공개]"));
    assert.ok(!output.share.neighbor_text.includes("[동호수 비공개]"));
    assert.ok(output.share.neighbor_text.includes("해당 공용 구역"));
  });

  it("keeps privacy meta wording out of draft titles", () => {
    const output = draftCivicReport({
      issue_code: "ROAD_SIDEWALK_DAMAGE",
      facts: {
        what: "집 앞 보도블록 일부가 깨져 유모차 바퀴가 걸립니다.",
        where_general: "집 앞 보도, 정확한 주소는 공개하지 않음"
      }
    });
    assert.equal(output.result_type, "draft");
    assert.ok(output.draft);
    assert.ok(!output.draft.title.includes("정확한 주소"));
    assert.ok(!output.draft.title.includes("공개하지"));
    assert.ok(!output.share.neighbor_text.includes("정확한 주소"));
    assert.ok(!output.share.neighbor_text.includes("공개하지"));
    assert.match(output.draft.copy_block, /^제목: \[보도블록 파손\] 보도블록 파손 점검 요청/);
  });

  it("accepts PlayMCP category hints for draft issue_code", () => {
    const output = draftCivicReport({
      issue_code: "road_walkway",
      facts: {
        what: "집 앞 보도블록이 깨져서 유모차가 걸려요."
      },
      tone: "formal",
      language: "ko"
    });
    assert.equal(output.result_type, "draft");
    assert.match(output.draft?.title ?? "", /보도블록 파손/);
    assert.match(output.draft?.copy_block ?? "", /유모차/);
  });

  it("masks PlayMCP-provided privacy details when resolving category hints", () => {
    const output = draftCivicReport({
      issue_code: "environment_sanitation",
      facts: {
        what: "우리 빌라 302호 앞에 음식물 쓰레기가 계속 버려지고 있습니다. 사진에는 차량번호 12가3456도 찍혔습니다.",
        where_general: "우리 빌라 302호 앞",
        photo_note: "차량번호 12가3456이 찍힌 사진이 있습니다."
      },
      tone: "formal",
      include_neighbor_share_text: false,
      language: "ko"
    });
    assert.equal(output.result_type, "draft");
    assert.ok(output.draft);
    assert.match(output.draft.title, /쓰레기|음식물/);
    assert.ok(!output.draft.copy_block.includes("12가3456"));
    assert.ok(!output.draft.copy_block.includes("302호"));
    assert.equal(output.share.neighbor_text, "");
  });

  it("routes PlayMCP direct personal-help draft calls out of scope", () => {
    const output = draftCivicReport({
      issue_code: "unknown",
      facts: {
        what: "오늘 밤 9시에 냉장고 옮기는 것을 도와줄 사람을 찾습니다.",
        when_observed: "오늘 밤 9시",
        impact: "냉장고를 안전하게 옮기기 위해 도움이 필요합니다."
      },
      tone: "neutral",
      include_neighbor_share_text: true,
      language: "ko"
    });
    assert.equal(output.result_type, "out_of_scope");
    assert.equal(output.draft, null);
    assert.ok(output.errors.some((error) => error.code === "E_NEIGHBOR_HELP_UNSUPPORTED"));
    assert.match(output.errors[0]?.message ?? "", /로드맵/);
    assert.ok(output.privacy_redactions.some((item) => item.includes("정확한 주소")));
    assert.match(output.answer_markdown, /정확한 주소·호수/);
    assert.match(output.answer_markdown, /플랫폼 안의 메시지/);
  });

  it("formats a park broken-glass report with copy-ready text and direct official links", () => {
    const output = draftCivicReport({
      issue_code: "PARK_FACILITY_DAMAGE",
      facts: {
        what: "동네 공원 벤치 옆에 깨진 유리조각이 흩어져 있습니다.",
        where_general: "동네 공원 벤치 옆",
        impact: "아이들이 지나다니는 구역이라 베임 사고 위험이 있습니다.",
        photo_note: "사진 1장을 첨부할 예정입니다."
      },
      include_neighbor_share_text: true,
      language: "ko"
    });
    const summary = formatDraftSummary(output);

    assert.equal(output.result_type, "draft");
    assert.doesNotMatch(summary, /분류되었습니다|분류됩니다/);
    assert.match(summary, /복사해서 붙여넣을 신고문/);
    assert.match(summary, /제목:/);
    assert.match(summary, /동네 공원 벤치 옆/);
    assert.match(summary, /사진 1장/);
    assert.match(summary, /안전신문고/);
    assert.match(summary, /국민신문고/);
    assert.match(summary, /지역\/구청 공식 생활민원 페이지 직접 선택/);
    assert.match(summary, /https:\/\/www\.mois\.go\.kr/);
    assert.match(output.answer_markdown, /바로 .*붙여넣을 신고문/);
    assert.match(output.answer_markdown, /```text/);
    assert.match(output.answer_markdown, /동네SOS는 신고 준비만 돕고 실제 접수/);
  });
});
