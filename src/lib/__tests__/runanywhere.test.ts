import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  __testing__,
  hasLocalAICachedFlag,
  initLocalAI,
  isLocalAIReady,
  localIntentParse,
  localTranslate,
} from "../runanywhere";

const originalWindow = (globalThis as { window?: unknown }).window;

interface MockStorageOptions {
  initialValue?: string | null;
  throwOnGet?: Error;
}

function setMockWindow(options: MockStorageOptions = {}) {
  const store = new Map<string, string>();
  if (options.initialValue !== undefined && options.initialValue !== null) {
    store.set("rasoisaathi_local_ai_ready", options.initialValue);
  }

  (globalThis as { window?: unknown }).window = {
    localStorage: {
      getItem(key: string) {
        if (options.throwOnGet) {
          throw options.throwOnGet;
        }
        return store.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        store.set(key, value);
      },
      removeItem(key: string) {
        store.delete(key);
      },
    },
  };

  return store;
}

interface FakeSdkOptions {
  downloadedOnDisk?: boolean;
  loadError?: Error;
  generateText?: string | ((prompt: string) => string);
  hydrateDelayMs?: number;
}

function createFakeSdk(options: FakeSdkOptions = {}) {
  const counts = {
    initialize: 0,
    llamaRegister: 0,
    modelRegister: 0,
    storageRefresh: 0,
    download: 0,
    load: 0,
    generate: 0,
  };

  let isReady = false;
  let isLlamaRegistered = false;
  const registeredModels = new Map<string, { id: string }>();

  const loadWebSdk = async () =>
    ({
      InferenceFramework: { INFERENCE_FRAMEWORK_LLAMA_CPP: 1 },
      ModelCategory: { MODEL_CATEGORY_LANGUAGE: 1 },
      ModelFormat: { MODEL_FORMAT_GGUF: 1 },
      RunAnywhere: {
        get isReady() {
          return isReady;
        },
        async initialize() {
          counts.initialize += 1;
          isReady = true;
        },
        storage: {
          async refresh() {
            counts.storageRefresh += 1;
            if (options.hydrateDelayMs) {
              await new Promise((resolve) => setTimeout(resolve, options.hydrateDelayMs));
            }
          },
        },
        models: {
          get(id: string) {
            return registeredModels.get(id) ?? null;
          },
          register(model: { id: string }) {
            counts.modelRegister += 1;
            registeredModels.set(model.id, model);
          },
          list(filter?: { downloadedOnly?: boolean }) {
            const all = Array.from(registeredModels.values());
            if (filter?.downloadedOnly) {
              return options.downloadedOnDisk === false ? [] : all;
            }
            return all;
          },
          async *download() {
            counts.download += 1;
            yield { type: "progress", overallProgress: 1, bytesDone: 386_000_000, bytesTotal: 386_000_000 };
            yield { type: "completed" };
          },
          async load() {
            counts.load += 1;
            if (options.loadError) {
              throw options.loadError;
            }
          },
        },
        llm: {
          async generate(prompt: string) {
            counts.generate += 1;
            const text =
              typeof options.generateText === "function"
                ? options.generateText(prompt)
                : (options.generateText ?? "नमस्ते");
            return { text };
          },
        },
      },
    }) as unknown as Awaited<ReturnType<typeof import("@runanywhere/web") extends never ? never : () => Promise<typeof import("@runanywhere/web")>>>;

  const loadLlamaPkg = async () =>
    ({
      LlamaCPP: {
        get isRegistered() {
          return isLlamaRegistered;
        },
        async register() {
          counts.llamaRegister += 1;
          isLlamaRegistered = true;
        },
      },
    }) as unknown as typeof import("@runanywhere/web-llamacpp");

  return {
    counts,
    loader: { loadWebSdk, loadLlamaPkg },
  };
}

beforeEach(() => {
  __testing__.resetStateForTests();
});

afterEach(() => {
  __testing__.resetStateForTests();
  if (originalWindow === undefined) {
    delete (globalThis as { window?: unknown }).window;
  } else {
    (globalThis as { window?: unknown }).window = originalWindow;
  }
});

describe("runanywhere helpers", () => {
  it("reports not ready and uncached in SSR environment", () => {
    delete (globalThis as { window?: unknown }).window;
    assert.equal(isLocalAIReady(), false);
    assert.equal(hasLocalAICachedFlag(), false);
  });

  it("reads cached flag safely from window.localStorage", () => {
    setMockWindow({ initialValue: null });
    assert.equal(hasLocalAICachedFlag(), false);

    setMockWindow({ initialValue: "false" });
    assert.equal(hasLocalAICachedFlag(), false);

    setMockWindow({ initialValue: "true" });
    assert.equal(hasLocalAICachedFlag(), true);

    setMockWindow({ throwOnGet: new Error("SecurityError") });
    assert.equal(hasLocalAICachedFlag(), false);
  });

  it("returns null / fallback error in SSR and when local AI is not cached", async () => {
    const fake = createFakeSdk();
    __testing__.setSdkLoaderForTests(fake.loader);

    delete (globalThis as { window?: unknown }).window;
    assert.equal(await localIntentParse("Aaj kitne tiffin", "hi", { cookLang: "hi" }), null);
    assert.deepEqual(await localTranslate("Namaste", "hi", "en"), {
      translated: "Namaste",
      error: "Local AI model not loaded — showing original text",
    });

    setMockWindow({ initialValue: null });
    assert.equal(await localIntentParse("Aaj kitne tiffin", "hi", { cookLang: "hi" }), null);
    assert.deepEqual(await localTranslate("Namaste", "hi", "en"), {
      translated: "Namaste",
      error: "Local AI model not loaded — showing original text",
    });
    assert.equal(fake.counts.initialize, 0);
  });

  it("auto-hydrates cached model for localTranslate after reload", async () => {
    setMockWindow({ initialValue: "true" });
    const fake = createFakeSdk({
      downloadedOnDisk: true,
      generateText: "Hello",
    });
    __testing__.setSdkLoaderForTests(fake.loader);

    assert.equal(isLocalAIReady(), false);
    const res = await localTranslate("Namaste", "hi", "en");
    assert.deepEqual(res, { translated: "Hello" });
    assert.equal(isLocalAIReady(), true);
    assert.equal(fake.counts.initialize, 1);
    assert.equal(fake.counts.llamaRegister, 1);
    assert.equal(fake.counts.modelRegister, 1);
    assert.equal(fake.counts.storageRefresh, 1);
    assert.equal(fake.counts.load, 1);
    assert.equal(fake.counts.download, 0);
    assert.equal(fake.counts.generate, 1);
  });

  it("auto-hydrates cached model for localIntentParse and deduplicates concurrent hydration", async () => {
    setMockWindow({ initialValue: "true" });
    const fake = createFakeSdk({
      downloadedOnDisk: true,
      hydrateDelayMs: 15,
      generateText: (prompt) =>
        prompt.includes("Translate from")
          ? "Please skip tomorrow"
          : '{"intent":"skip","entities":{"customer_name":"Priya Sharma","date":"tomorrow"},"confidence":0.92}',
    });
    __testing__.setSdkLoaderForTests(fake.loader);

    const [parsed, translated] = await Promise.all([
      localIntentParse("Priya ko kal skip karo", "hi", {
        cookLang: "hi",
        customers: [{ id: "1", name: "Priya Sharma" }],
      }),
      localTranslate("Kal skip please", "hi", "en"),
    ]);

    assert.equal(parsed?.intent, "skip");
    assert.equal(parsed?.entities.customerName, "Priya Sharma");
    assert.equal(parsed?.entities.date, "tomorrow");
    assert.equal(parsed?.confidence, 0.92);
    assert.deepEqual(translated, { translated: "Please skip tomorrow" });
    assert.equal(fake.counts.initialize, 1);
    assert.equal(fake.counts.storageRefresh, 1);
    assert.equal(fake.counts.load, 1);

    // Subsequent call reuses resident model without re-hydrating
    const second = await localTranslate("Dhanyavaad", "hi", "en");
    assert.deepEqual(second, { translated: "Please skip tomorrow" });
    assert.equal(fake.counts.load, 1);
    assert.equal(fake.counts.generate, 3);
  });

  it("clears stale cache flag if OPFS model bytes are missing after reload", async () => {
    const store = setMockWindow({ initialValue: "true" });
    const fake = createFakeSdk({ downloadedOnDisk: false });
    __testing__.setSdkLoaderForTests(fake.loader);

    const res = await localTranslate("Namaste", "hi", "en");
    assert.deepEqual(res, {
      translated: "Namaste",
      error: "Local AI model not loaded — showing original text",
    });
    assert.equal(isLocalAIReady(), false);
    assert.equal(hasLocalAICachedFlag(), false);
    assert.equal(store.has("rasoisaathi_local_ai_ready"), false);
    assert.equal(fake.counts.load, 0);

    // Next call short-circuits immediately without scanning OPFS again
    await localIntentParse("Aaj kitne tiffin", "hi", { cookLang: "hi" });
    assert.equal(fake.counts.storageRefresh, 1);
  });

  it("recovers cleanly when models.load fails during auto-hydration", async () => {
    setMockWindow({ initialValue: "true" });
    const fake = createFakeSdk({
      downloadedOnDisk: true,
      loadError: new Error("OOM loading GGUF"),
    });
    __testing__.setSdkLoaderForTests(fake.loader);

    const parsed = await localIntentParse("Aaj kitne tiffin", "hi", { cookLang: "hi" });
    assert.equal(parsed, null);
    assert.equal(isLocalAIReady(), false);
    // Transient load failure preserves cache flag for retry
    assert.equal(hasLocalAICachedFlag(), true);
  });

  it("coordinates initLocalAI with in-flight hydration without double-loading", async () => {
    setMockWindow({ initialValue: "true" });
    const fake = createFakeSdk({
      downloadedOnDisk: true,
      hydrateDelayMs: 20,
      generateText: "Namaste",
    });
    __testing__.setSdkLoaderForTests(fake.loader);

    const translatePromise = localTranslate("Hello", "en", "hi");
    const initResult = await initLocalAI();
    const translateResult = await translatePromise;

    assert.equal(initResult, true);
    assert.deepEqual(translateResult, { translated: "Namaste" });
    assert.equal(fake.counts.initialize, 1);
    assert.equal(fake.counts.load, 1);
    assert.equal(fake.counts.download, 0);
  });
});
