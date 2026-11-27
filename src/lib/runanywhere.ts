import {
  keywordProcess,
  type KnownCustomerRef,
  type ParsedCommand,
} from "./voice-fallback";

const LOCAL_MODEL_ID = "smollm2-360m-instruct-q8_0";
const LOCAL_MODEL_URL =
  "https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct-GGUF/resolve/main/smollm2-360m-instruct-q8_0.gguf";
const LOCAL_AI_READY_KEY = "rasoisaathi_local_ai_ready";

let engineInitialized = false;
let modelLoaded = false;
let initPromise: Promise<boolean> | null = null;
let hydratePromise: Promise<boolean> | null = null;

type WebSdkModule = typeof import("@runanywhere/web");
type LlamaPkgModule = typeof import("@runanywhere/web-llamacpp");

interface SdkLoader {
  loadWebSdk: () => Promise<WebSdkModule>;
  loadLlamaPkg: () => Promise<LlamaPkgModule>;
}

const defaultSdkLoader: SdkLoader = {
  loadWebSdk: () => import("@runanywhere/web"),
  loadLlamaPkg: () => import("@runanywhere/web-llamacpp"),
};

let sdkLoader: SdkLoader = defaultSdkLoader;

export interface LocalVoiceContext {
  cookLang: string;
  customers?: KnownCustomerRef[];
  tally?: { activeTiffins: number; pendingPaymentsTotal: number };
}

export function isLocalAIReady(): boolean {
  return engineInitialized && modelLoaded;
}

export function hasLocalAICachedFlag(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(LOCAL_AI_READY_KEY) === "true";
  } catch {
    return false;
  }
}

function clearLocalAICachedFlag(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LOCAL_AI_READY_KEY);
  } catch {
    // Ignore storage errors
  }
}

async function bootRunAnywhereEngine(): Promise<WebSdkModule> {
  const [webSdk, llamaPkg] = await Promise.all([
    sdkLoader.loadWebSdk(),
    sdkLoader.loadLlamaPkg(),
  ]);

  if (!webSdk.RunAnywhere.isReady) {
    await webSdk.RunAnywhere.initialize({
      environment: "development",
      appName: "RasoiSaathi",
    });
  }

  if (!llamaPkg.LlamaCPP.isRegistered) {
    await llamaPkg.LlamaCPP.register({
      acceleration: "auto",
      preferBackendWorker: false,
      wasmUrl: "/wasm/racommons-llamacpp.js",
      webgpuWasmUrl: "/wasm/racommons-llamacpp-webgpu.js",
    });
  }

  engineInitialized = true;
  return webSdk;
}

function ensureLocalModelRegistered(webSdk: WebSdkModule): void {
  const { RunAnywhere, InferenceFramework, ModelCategory, ModelFormat } = webSdk;
  if (!RunAnywhere.models.get(LOCAL_MODEL_ID)) {
    RunAnywhere.models.register({
      id: LOCAL_MODEL_ID,
      name: "SmolLM2 360M Instruct",
      framework: InferenceFramework.INFERENCE_FRAMEWORK_LLAMA_CPP,
      category: ModelCategory.MODEL_CATEGORY_LANGUAGE,
      format: ModelFormat.MODEL_FORMAT_GGUF,
      url: LOCAL_MODEL_URL,
      sizeBytes: 386_000_000,
      memoryRequiredBytes: 512 * 1024 * 1024,
      contextLength: 2048,
    });
  }
}

async function ensureLocalModelLoaded(): Promise<boolean> {
  if (typeof window === "undefined") {
    return false;
  }

  if (isLocalAIReady()) {
    return true;
  }

  if (hydratePromise) {
    return hydratePromise;
  }

  if (initPromise) {
    try {
      return await initPromise;
    } catch {
      return false;
    }
  }

  // Only auto-hydrate if user previously downloaded/enabled local AI
  if (!hasLocalAICachedFlag()) {
    return false;
  }

  hydratePromise = (async () => {
    try {
      const webSdk = await bootRunAnywhereEngine();
      ensureLocalModelRegistered(webSdk);
      await webSdk.RunAnywhere.storage.refresh();
      const downloaded = webSdk.RunAnywhere.models
        .list({ downloadedOnly: true })
        .some((m) => m.id === LOCAL_MODEL_ID);
      if (!downloaded) {
        clearLocalAICachedFlag();
        return false;
      }
      await webSdk.RunAnywhere.models.load(LOCAL_MODEL_ID);
      modelLoaded = true;
      return true;
    } catch (err) {
      console.warn("RunAnywhere auto-hydration failed:", err);
      return false;
    } finally {
      hydratePromise = null;
    }
  })();

  return hydratePromise;
}

export async function initLocalAI(
  onProgress?: (pct: number, msg: string) => void
): Promise<boolean> {
  if (typeof window === "undefined") {
    throw new Error("Local AI can only run in a browser environment.");
  }

  if (isLocalAIReady()) {
    onProgress?.(100, "Local AI ready!");
    return true;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      if (hydratePromise) {
        onProgress?.(15, "Checking cached local AI model...");
        const hydrated = await hydratePromise;
        if (hydrated && isLocalAIReady()) {
          onProgress?.(100, "Local AI ready!");
          return true;
        }
      }

      onProgress?.(10, "Starting RunAnywhere WASM engine...");
      const webSdk = await bootRunAnywhereEngine();
      const { RunAnywhere } = webSdk;

      onProgress?.(20, "Registering SmolLM2-360M local model...");
      ensureLocalModelRegistered(webSdk);
      await RunAnywhere.storage.refresh();

      const downloadedList = RunAnywhere.models.list({ downloadedOnly: true });
      const alreadyDownloaded = downloadedList.some((m) => m.id === LOCAL_MODEL_ID);

      if (!alreadyDownloaded) {
        onProgress?.(25, "Downloading SmolLM2-360M (~386 MB, cached once)...");
        for await (const ev of RunAnywhere.models.download(LOCAL_MODEL_ID)) {
          if (ev.type === "progress") {
            const ratio =
              typeof ev.overallProgress === "number"
                ? ev.overallProgress
                : ev.bytesTotal > 0
                  ? ev.bytesDone / ev.bytesTotal
                  : 0;
            const pct = Math.min(90, Math.max(25, Math.round(25 + ratio * 65)));
            const mbDone = Math.round((ev.bytesDone || 0) / (1024 * 1024));
            const mbTotal = Math.round((ev.bytesTotal || 386_000_000) / (1024 * 1024));
            onProgress?.(pct, `Downloading local AI model... ${mbDone}/${mbTotal} MB`);
          } else if (ev.type === "failed") {
            throw new Error(ev.error?.message || "Model download failed");
          } else if (ev.type === "cancelled") {
            throw new Error("Model download cancelled");
          }
        }
      }

      onProgress?.(92, "Loading local model into memory...");
      await RunAnywhere.models.load(LOCAL_MODEL_ID);

      modelLoaded = true;
      try {
        window.localStorage.setItem(LOCAL_AI_READY_KEY, "true");
      } catch {
        // Ignore storage errors
      }
      onProgress?.(100, "Local AI ready! Offline mode active.");
      return true;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

export async function localIntentParse(
  text: string,
  cookLang: string,
  context: LocalVoiceContext
): Promise<ParsedCommand | null> {
  try {
    if (!(await ensureLocalModelLoaded())) {
      return null;
    }

    const { RunAnywhere } = await sdkLoader.loadWebSdk();
    const customerNames = (context.customers ?? []).map((c) => c.name).join(", ");
    const prompt = `You are RasoiSaathi, a tiffin business assistant.
Parse this voice command and reply ONLY with JSON:
{"intent":"tally|add_customer|remove_customer|skip|cancel|pause|resume|extra|diet_change|payment_check|payment_remind|menu_broadcast|greeting|unknown","entities":{"customer_name":null,"dietary_pref":null,"price":null,"days":null,"date":null,"extra_items":null},"confidence":0.85}
Cook language: ${cookLang}
Customers: ${customerNames || "none"}
Command: "${text}"`;

    const result = await RunAnywhere.llm.generate(prompt, {
      model: LOCAL_MODEL_ID,
      maxOutputTokens: 160,
      temperature: 0.15,
    });

    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    const rawEntities =
      parsed.entities && typeof parsed.entities === "object"
        ? (parsed.entities as Record<string, unknown>)
        : {};

    const fallback = keywordProcess(text, context.customers);
    const intent =
      typeof parsed.intent === "string" && parsed.intent !== "unknown"
        ? (parsed.intent as ParsedCommand["intent"])
        : fallback.intent;

    return {
      intent,
      entities: {
        ...fallback.entities,
        ...(typeof rawEntities.customer_name === "string" && rawEntities.customer_name.trim()
          ? { customerName: rawEntities.customer_name.trim() }
          : {}),
        ...(typeof rawEntities.dietary_pref === "string" && rawEntities.dietary_pref.trim()
          ? { dietaryPref: rawEntities.dietary_pref.trim() }
          : {}),
        ...(typeof rawEntities.price === "number" && rawEntities.price > 0
          ? { price: Math.round(rawEntities.price) }
          : {}),
        ...(typeof rawEntities.days === "number" && rawEntities.days > 0
          ? { days: Math.round(rawEntities.days) }
          : {}),
        ...(rawEntities.date === "tomorrow" || rawEntities.date === "today"
          ? { date: rawEntities.date }
          : {}),
        ...(typeof rawEntities.extra_items === "string" && rawEntities.extra_items.trim()
          ? { extraItems: rawEntities.extra_items.trim() }
          : {}),
      },
      confidence:
        typeof parsed.confidence === "number" ? parsed.confidence : fallback.confidence,
    };
  } catch (err) {
    console.warn("RunAnywhere localIntentParse fallback to keywords:", err);
    return null;
  }
}

export async function localTranslate(
  text: string,
  fromLang: string,
  toLang: string
): Promise<{ translated: string; error?: string }> {
  if (!(await ensureLocalModelLoaded())) {
    return {
      translated: text,
      error: "Local AI model not loaded — showing original text",
    };
  }

  try {
    const { RunAnywhere } = await sdkLoader.loadWebSdk();
    const result = await RunAnywhere.llm.generate(
      `Translate from ${fromLang} to ${toLang}. Return ONLY the translation, nothing else.\n\n"${text}"`,
      {
        model: LOCAL_MODEL_ID,
        maxOutputTokens: 180,
        temperature: 0.1,
      }
    );
    return { translated: result.text.trim() || text };
  } catch {
    return {
      translated: text,
      error: "Local translation unavailable — showing original text",
    };
  }
}

export const __testing__ = {
  resetStateForTests(): void {
    engineInitialized = false;
    modelLoaded = false;
    initPromise = null;
    hydratePromise = null;
    sdkLoader = defaultSdkLoader;
  },
  setSdkLoaderForTests(loader: SdkLoader): void {
    sdkLoader = loader;
  },
};
