import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { classifyCivicIssue } from "../../src/core/classify.js";
import { taxonomyData } from "../../src/data/loadData.js";

const examples: Record<string, string> = {
  ROAD_SIDEWALK_DAMAGE: "집 앞 보도블록이 깨져서 유모차 바퀴가 걸립니다.",
  ROAD_POTHOLE: "차도에 포트홀이 생겨 차량이 지나갈 때 크게 흔들립니다.",
  ROAD_SUBSIDENCE_CRACK: "도로 균열과 지반침하가 보여 금이 길게 갈라졌습니다.",
  TACTILE_PAVING_DAMAGE: "점자블록 일부가 빠져 시각장애인 보행이 위험해 보입니다.",
  CROSSWALK_FADED: "횡단보도 도색이 거의 지워져 야간에 잘 안 보입니다.",
  ROAD_SIGN_DAMAGE: "도로표지판이 기울어져 운전자에게 잘 안 보여요.",
  MANHOLE_DEFECT: "맨홀 뚜껑이 덜컹거리고 일부 깨짐이 있습니다.",
  STREETLIGHT_OUT: "골목 가로등이 안 켜져 밤에 매우 어둡습니다.",
  TRAFFIC_LIGHT_FAULT: "교차로 신호등이 계속 깜빡이며 오작동합니다.",
  BUS_STOP_FACILITY: "버스정류장 쉘터 의자가 깨져 이용하기 어렵습니다.",
  PARK_FACILITY_DAMAGE: "공원 놀이터 미끄럼틀이 파손되어 아이들이 다칠까 걱정됩니다.",
  PUBLIC_TOILET_ISSUE: "공중화장실 변기 고장과 악취가 심합니다.",
  ILLEGAL_DUMPING: "골목에 종량제 봉투 밖 쓰레기가 쌓여 방치되어 있습니다.",
  FOOD_WASTE_SPILL: "음식물쓰레기 국물이 흘러 악취가 나고 바닥이 더럽습니다.",
  ODOR_NUISANCE: "하수 냄새 같은 악취가 특정 시간대마다 반복됩니다.",
  SEWER_BACKFLOW: "하수구가 막힘 상태라 오수가 조금씩 역류합니다.",
  WATER_LEAK_PUBLIC: "도로 물이 계속 흐르고 상수도 누수가 의심됩니다.",
  DRAIN_FLOODING: "비만 오면 배수구 막힘으로 도로 침수가 생깁니다.",
  ANIMAL_CARCASS: "도로 가장자리에 동물 사체가 있어 수거가 필요해 보입니다.",
  ILLEGAL_BANNER: "현수막이 신호등 시야를 가리고 있어 통행에 방해됩니다.",
  ILLEGAL_FLYER: "전봇대와 벽에 불법광고물 벽보 스티커가 많이 붙어 있습니다.",
  OBSTRUCTION_GOODS: "상가 앞 적치물이 보도를 막아 통행 방해가 됩니다.",
  ABANDONED_BIKE: "자전거 방치가 오래되어 보도 통행에 불편합니다.",
  ABANDONED_SCOOTER: "공유 킥보드가 점자블록 위에 방치되어 보행을 막고 있습니다.",
  ILLEGAL_PARKING_SAFETY: "소화전 앞 불법주정차 차량 때문에 안전 통행이 어렵습니다.",
  SCHOOL_ZONE_SAFETY: "어린이보호구역 등굣길에 위험한 통행 문제가 있습니다.",
  CONSTRUCTION_SAFETY: "공사장 안전펜스가 넘어져 보행자 통행이 위험합니다.",
  STREET_TREE_HAZARD: "가로수 나뭇가지 처짐으로 보행자 머리에 닿을 것 같습니다."
};

describe("taxonomy coverage", () => {
  for (const item of taxonomyData.items) {
    it(`classifies ${item.code}`, () => {
      const description = examples[item.code];
      assert.ok(description, `missing coverage example for ${item.code}`);

      const output = classifyCivicIssue({ description });
      assert.equal(output.result_type, "classification");
      assert.equal(output.issue.code, item.code);
      assert.equal(output.draft_policy.can_draft, true);
      assert.ok(output.evidence.required.length > 0);
    });
  }

  it("keeps taxonomy coverage fixture count aligned with taxonomy size", () => {
    assert.equal(Object.keys(examples).length, taxonomyData.taxonomy_size);
  });
});
