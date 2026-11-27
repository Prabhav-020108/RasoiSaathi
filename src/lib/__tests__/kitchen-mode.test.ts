import assert from "node:assert/strict";
import { test } from "node:test";
import { getCurrentMonthKey, getTodayUTC } from "../kitchen-date";
import { kitchenControl, wakeCommand } from "../kitchen-language";
import { keywordProcess } from "../voice-fallback";
import { getDictionary } from "../../i18n";

test("wake activation requires an exact name at the start of the transcript", () => {
  assert.equal(wakeCommand("Hey Rasoi Saathi, how many tiffins?"), "how many tiffins?");
  assert.equal(wakeCommand("ರಸೋಯಿ ಸಾಥಿ ಸಂದೇಶಗಳನ್ನು ಓದಿ"), "ಸಂದೇಶಗಳನ್ನು ಓದಿ");
  assert.equal(wakeCommand("रसोईसाथी"), "");
  assert.equal(wakeCommand("She said RasoiSaathi earlier"), null);
  assert.equal(wakeCommand("RasoiSaathiya"), null);
  assert.equal(kitchenControl("ಹೌದು."), "yes");
  assert.equal(kitchenControl("yes, but wait"), undefined);
});

test("Indian day and billing month change at 18:30 UTC", () => {
  const before = new Date("2026-11-30T18:29:59Z");
  const after = new Date("2026-11-30T18:30:00Z");
  assert.equal(getTodayUTC(before).toISOString(), "2026-11-30T00:00:00.000Z");
  assert.equal(getTodayUTC(after).toISOString(), "2026-12-01T00:00:00.000Z");
  assert.equal(getCurrentMonthKey(before), "2026-11");
  assert.equal(getCurrentMonthKey(after), "2026-12");
});

test("Basic Mode recognizes native-script tally queries and does not save a draft for a menu question", () => {
  [
    "कल कितने टिफिन?",
    "ನಾಳೆ ಎಷ್ಟು ಟಿಫಿನ್?",
    "நாளை எத்தனை டிபன்?",
    "రేపు ఎన్ని టిఫిన్?",
    "उद्या किती डबे?",
  ].forEach((text) => {
    const result = keywordProcess(text);
    assert.equal(result.intent, "tally", text);
    assert.equal(result.entities.date, "tomorrow", text);
  });
  assert.notEqual(keywordProcess("What is tomorrow's menu?").intent, "menu_broadcast");
  assert.equal(getDictionary("mr").todayTiffin, "आजचे डबे");
});
