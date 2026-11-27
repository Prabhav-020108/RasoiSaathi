import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeTallyFromData } from "../tally";
import { keywordProcess } from "../voice-fallback";
import { parseGeminiStructuredPayload } from "../gemini";
import { findMatchingCustomers, resolveCustomerMatches } from "../voice-actions";
import { getDictionary } from "../../i18n";
import { isConfiguredGeminiKey } from "../utils";

describe("computeTallyFromData", () => {
  it("handles empty inputs safely", () => {
    const res = computeTallyFromData([], [], []);
    assert.equal(res.totalCustomers, 0);
    assert.equal(res.activeTiffins, 0);
    assert.equal(res.pendingPaymentsTotal, 0);
    assert.equal(res.collectedPaymentsTotal, 0);
  });

  it("calculates dietary breakdown, skipped, paused, cancelled, and extras accurately", () => {
    const now = new Date("2026-11-27T06:00:00Z");
    const customers = [
      { id: "1", name: "Rajesh", dietaryPref: "regular", status: "active", pauseUntil: null },
      { id: "2", name: "Priya", dietaryPref: "jain", status: "active", pauseUntil: null },
      { id: "3", name: "Amit", dietaryPref: "regular", status: "active", pauseUntil: null },
      { id: "4", name: "Deepa", dietaryPref: "less-oil", status: "active", pauseUntil: null },
      { id: "5", name: "Meena", dietaryPref: "less-oil", status: "paused", pauseUntil: new Date("2026-11-30T00:00:00Z") },
      { id: "6", name: "Pooja", dietaryPref: "regular", status: "active", pauseUntil: null },
      { id: "7", name: "Sanjay", dietaryPref: "no-onion-garlic", status: "active", pauseUntil: null },
      { id: "8", name: "Old", dietaryPref: "regular", status: "cancelled", pauseUntil: null },
    ];
    const dailyOrders = [
      { customerId: "3", status: "skipped", extraItems: null },
      { customerId: "6", status: "extra", extraItems: "2 extra roti" },
    ];
    const payments = [
      { amount: 3000, paidAmount: 3000, status: "paid" },
      { amount: 3500, paidAmount: 0, status: "pending" },
      { amount: 3000, paidAmount: 1000, status: "partial" },
    ];

    const res = computeTallyFromData(customers, dailyOrders, payments, now);

    assert.equal(res.totalCustomers, 8);
    assert.equal(res.activeTiffins, 5);
    assert.equal(res.dietary.regular, 2);
    assert.equal(res.dietary.jain, 1);
    assert.equal(res.dietary.lessOil, 1);
    assert.equal(res.dietary.noOnionGarlic, 1);
    assert.equal(res.skippedCount, 1);
    assert.equal(res.pausedCount, 1);
    assert.equal(res.cancelledCount, 1);
    assert.equal(res.extraCount, 1);
    assert.equal(res.extraRequests[0]?.items, "2 extra roti");
    assert.equal(res.collectedPaymentsTotal, 4000);
    assert.equal(res.pendingPaymentsTotal, 5500);
    assert.equal(res.pendingPaymentsCount, 2);
  });

  it("treats future pauseUntil on active status as paused", () => {
    const now = new Date("2026-11-27T06:00:00Z");
    const res = computeTallyFromData(
      [
        {
          id: "1",
          name: "Test",
          dietaryPref: "regular",
          status: "active",
          pauseUntil: new Date("2026-11-29T00:00:00Z"),
        },
      ],
      [],
      [],
      now
    );
    assert.equal(res.activeTiffins, 0);
    assert.equal(res.pausedCount, 1);
  });
});

describe("keywordProcess (Tier 3 fallback)", () => {
  const sampleCustomers = [
    { id: "c1", name: "Rajesh Kumar", phone: "+91 98111 10001" },
    { id: "c2", name: "Priya Sharma", phone: "+91 98111 10002" },
    { id: "c3", name: "Amit Verma", phone: "+91 98111 10003" },
    { id: "c4", name: "Pooja Reddy", phone: "+91 98111 10008" },
    { id: "c5", name: "Meena Ji", phone: "+91 98111 10006" },
  ];

  it("recognizes core Hinglish and English commands", () => {
    assert.equal(keywordProcess("Aaj kitne tiffin banane hain?").intent, "tally");
    assert.equal(keywordProcess("Kisne payment nahi kiya?").intent, "payment_check");
    assert.equal(keywordProcess("Naya customer jodo").intent, "add_customer");
    assert.equal(keywordProcess("Amit aaj skip kardo").intent, "skip");
    assert.equal(keywordProcess("Tiffin cancel karo").intent, "cancel");
    assert.equal(keywordProcess("2 extra roti bhejna").intent, "extra");
  });

  it("extracts customer, diet, price, days, and date entities", () => {
    const addCmd = keywordProcess(
      "Naya customer jodo, naam Kavita Patel, Jain khana, monthly 3200",
      sampleCustomers
    );
    assert.equal(addCmd.intent, "add_customer");
    assert.equal(addCmd.entities.customerName, "Kavita Patel");
    assert.equal(addCmd.entities.dietaryPref, "jain");
    assert.equal(addCmd.entities.price, 3200);

    const removeCmd = keywordProcess("Remove customer Rajesh", sampleCustomers);
    assert.equal(removeCmd.intent, "remove_customer");
    assert.equal(removeCmd.entities.customerName, "Rajesh");

    const pauseCmd = keywordProcess("Meena ko 5 din pause kardo", sampleCustomers);
    assert.equal(pauseCmd.intent, "pause");
    assert.equal(pauseCmd.entities.customerName, "Meena");
    assert.equal(pauseCmd.entities.days, 5);

    const skipTomorrow = keywordProcess("Skip Priya tomorrow", sampleCustomers);
    assert.equal(skipTomorrow.intent, "skip");
    assert.equal(skipTomorrow.entities.customerName, "Priya");
    assert.equal(skipTomorrow.entities.date, "tomorrow");

    const resumeCmd = keywordProcess("Meena ko resume kardo", sampleCustomers);
    assert.equal(resumeCmd.intent, "resume");
    assert.equal(resumeCmd.entities.customerName, "Meena");

    const remindCmd = keywordProcess("Sabko payment reminder bhejo", sampleCustomers);
    assert.equal(remindCmd.intent, "payment_remind");

    const extraTallyQuery = keywordProcess("Aaj kitne extra tiffin hain?", sampleCustomers);
    assert.equal(extraTallyQuery.intent, "tally");

    const lowercaseDelete = keywordProcess("vikram ko delete karo", sampleCustomers);
    assert.equal(lowercaseDelete.intent, "remove_customer");
    assert.equal(lowercaseDelete.entities.customerName, "vikram");

    const singlePayCheck = keywordProcess("Priya ka payment check karo", sampleCustomers);
    assert.equal(singlePayCheck.intent, "payment_check");
    assert.equal(singlePayCheck.entities.customerName, "Priya");
  });

  it("handles empty and unknown inputs gracefully", () => {
    assert.equal(keywordProcess("   ").intent, "unknown");
    assert.equal(keywordProcess("random weather talk").intent, "unknown");
  });
});

describe("parseGeminiStructuredPayload", () => {
  it("parses fenced JSON and normalizes snake_case entities", () => {
    const raw = `\`\`\`json
    {
      "intent": "add_customer",
      "entities": {
        "customer_name": "Kavita Rao",
        "dietary_pref": "Jain",
        "price": 3400,
        "date": "tomorrow"
      },
      "response_text": "Kavita Rao ko add kar diya hai.",
      "confidence": 0.94,
      "detected_language": "hi"
    }
    \`\`\``;
    const parsed = parseGeminiStructuredPayload(raw);
    assert.equal(parsed.intent, "add_customer");
    assert.equal(parsed.entities.customerName, "Kavita Rao");
    assert.equal(parsed.entities.dietaryPref, "jain");
    assert.equal(parsed.entities.price, 3400);
    assert.equal(parsed.entities.date, "tomorrow");
    assert.equal(parsed.responseText, "Kavita Rao ko add kar diya hai.");
    assert.equal(parsed.confidence, 0.94);
    assert.equal(parsed.detectedLanguage, "hi");
  });

  it("coerces unrecognized intents to unknown and clamps confidence", () => {
    const parsed = parseGeminiStructuredPayload(
      JSON.stringify({ intent: "fly_to_moon", entities: {}, confidence: 1.8 })
    );
    assert.equal(parsed.intent, "unknown");
    assert.equal(parsed.confidence, 1);
  });
});

describe("findMatchingCustomers", () => {
  const pool = [
    {
      id: "1",
      name: "Rajesh Kumar",
      phone: "+91 98111 10001",
      phoneLast4: "0001",
      dietaryPref: "regular",
      status: "active",
      monthlyPrice: 3000,
    },
    {
      id: "2",
      name: "Rajesh Sharma",
      phone: "+91 98111 17721",
      phoneLast4: "7721",
      dietaryPref: "jain",
      status: "active",
      monthlyPrice: 3500,
    },
    {
      id: "3",
      name: "Priya Sharma",
      phone: "+91 98111 10002",
      phoneLast4: "0002",
      dietaryPref: "jain",
      status: "active",
      monthlyPrice: 3500,
    },
  ];

  it("returns multiple candidates for ambiguous first name and resolves by last 4 digits", () => {
    const ambiguous = findMatchingCustomers("Rajesh", pool);
    assert.equal(ambiguous.length, 2);

    const disambiguated = findMatchingCustomers("Rajesh 7721", pool);
    assert.equal(disambiguated.length, 1);
    assert.equal(disambiguated[0]?.id, "2");
  });

  it("matches full name unambiguously", () => {
    const exact = findMatchingCustomers("Priya Sharma", pool);
    assert.equal(exact.length, 1);
    assert.equal(exact[0]?.id, "3");
  });

  it("narrows ambiguous entity match using 4-digit phone suffix in originalText", () => {
    const resolved = resolveCustomerMatches("Rajesh", "Rajesh 7721 aaj skip kardo", pool);
    assert.equal(resolved.length, 1);
    assert.equal(resolved[0]?.id, "2");
  });
});

describe("i18n dictionary", () => {
  it("returns hi, en, kn and falls back to hi for unknown locale", () => {
    assert.equal(getDictionary("hi").todayTiffin, "Aaj Ka Tiffin");
    assert.equal(getDictionary("en").todayTiffin, "Today's Tiffins");
    assert.equal(getDictionary("kn").todayTiffin, "ಇಂದಿನ ಟಿಫಿನ್");
    assert.equal(getDictionary("unknown").todayTiffin, "Aaj Ka Tiffin");
  });
});

describe("isConfiguredGeminiKey", () => {
  it("rejects empty and placeholder values", () => {
    assert.equal(isConfiguredGeminiKey(undefined), false);
    assert.equal(isConfiguredGeminiKey(""), false);
    assert.equal(isConfiguredGeminiKey("   "), false);
    assert.equal(isConfiguredGeminiKey("your_key_here"), false);
    assert.equal(isConfiguredGeminiKey("your_gemini_api_key_here"), false);
    assert.equal(isConfiguredGeminiKey("placeholder"), false);
  });

  it("accepts non-placeholder API key values", () => {
    assert.equal(isConfiguredGeminiKey("AIzaSyDummyExampleKey123456"), true);
  });
});
