import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { authenticatedJsonPost } from "../src/authenticatedRequest.js";

const tailor = readFileSync(new URL("../api/tailor.js", import.meta.url), "utf8");
const intake = readFileSync(new URL("../api/job-intake.js", import.meta.url), "utf8");
const resumeIntake = readFileSync(new URL("../api/resume-intake.js", import.meta.url), "utf8");
const coverLetter = readFileSync(new URL("../api/cover-letter.js", import.meta.url), "utf8");
const evidenceCoach = readFileSync(new URL("../api/evidence-coach.js", import.meta.url), "utf8");
const tailorClient = readFileSync(new URL("../src/tailorClient.js", import.meta.url), "utf8");
const coverLetterClient = readFileSync(new URL("../src/coverLetterClient.js", import.meta.url), "utf8");

test("private APIs disable response and browser caching", async () => {
  for (const source of [tailor, intake, resumeIntake, coverLetter, evidenceCoach]) assert.match(source, /applyPrivateResponseHeaders\(res\)/);
  assert.match(tailorClient, /return authenticatedJsonPost\(/);
  assert.match(coverLetterClient, /await authenticatedJsonPost\(/);
  const session = {access_token:"test-token",user:{id:"test-user"}};
  await authenticatedJsonPost('/api/tailor',{resume:'Private test input'},{
    auth:{getSession:async()=>({data:{session}})},
    fetchImpl:async(_path,options)=>{
      assert.equal(options.cache,'no-store');
      assert.equal(options.credentials,'same-origin');
      assert.equal(options.method,'POST');
      return {ok:true,status:200,json:async()=>({})};
    },
  });
});

test("private API operational logs do not serialize resume or upstream bodies", () => {
  assert.doesNotMatch(tailor, /Incomplete structured resume[\s\S]*JSON\.stringify\(resumeData\)/);
  assert.doesNotMatch(tailor, /message:\s*error\.message/);
  assert.doesNotMatch(tailor, /console\.(?:warn|error)[^\n]*item\.title/);
  assert.doesNotMatch(intake, /console\.error\("Job intake failed:",\s*error\.message\)/);
  assert.doesNotMatch(resumeIntake, /console\.(?:warn|error)[^\n]*(?:toolUse\?\.input|req\.body|data\.content|image\.data)/i);
  assert.doesNotMatch(coverLetter, /console\.(?:warn|error)[^\n]*(?:resume|postingCorpus|candidateCorpus|item\.title)/i);
  assert.doesNotMatch(evidenceCoach, /console\.(?:warn|error)[^\n]*(?:candidate_input|proposed_wording|source_excerpt|req\.body)/i);
});
