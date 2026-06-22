import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { classifyCivicIssue } from "../../src/core/classify.js";
import { draftCivicReport } from "../../src/core/draft.js";
import { ClassificationOutputSchema, DraftOutputSchema } from "../../src/schemas/toolSchemas.js";

describe("tool output schemas", () => {
  it("accepts normal classification output", () => {
    const output = classifyCivicIssue({ description: "집 앞 보도블록이 깨져서 유모차가 걸려요." });
    assert.doesNotThrow(() => ClassificationOutputSchema.parse(output));
  });

  it("accepts emergency classification output", () => {
    const output = classifyCivicIssue({ description: "복도에서 가스 냄새가 심하게 나요." });
    assert.doesNotThrow(() => ClassificationOutputSchema.parse(output));
  });

  it("accepts normal draft output", () => {
    const output = draftCivicReport({
      issue_code: "ROAD_SIDEWALK_DAMAGE",
      facts: {
        what: "보도블록 일부가 깨져서 보행자가 걸릴 수 있습니다.",
        where_general: "○○초등학교 정문 앞 보도"
      }
    });
    assert.doesNotThrow(() => DraftOutputSchema.parse(output));
  });

  it("accepts blocked emergency draft output", () => {
    const output = draftCivicReport({
      issue_code: "EMERGENCY_GAS",
      facts: {
        what: "복도에서 가스 냄새가 심합니다."
      }
    });
    assert.doesNotThrow(() => DraftOutputSchema.parse(output));
  });
});
