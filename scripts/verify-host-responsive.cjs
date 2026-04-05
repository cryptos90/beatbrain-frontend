const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const jwt = require(path.resolve(__dirname, "..", "..", "beatbrain-backend", "node_modules", "jsonwebtoken"));
const { io } = require(path.resolve(__dirname, "..", "node_modules", "socket.io-client"));

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const REMOTE_DEBUG_PORT = 9222;
const HOST_ORIGIN = "http://127.0.0.1:8081";
const HOST_START_URL = `${HOST_ORIGIN}/host/start`;
const API_BASE_URL = "http://127.0.0.1:3000";
const STORAGE_KEY = "beatbrain_host_jwt";
const HOST_STATE_KEY = "beatbrain_host_web_state_v1";
const SCREENSHOT_DIR = path.resolve(__dirname, "..", "test-results", "host-responsive");
const REPORT_PATH = path.join(SCREENSHOT_DIR, "report.json");
const USER_DATA_DIR = path.join(SCREENSHOT_DIR, ".edge-profile");
const DUMMY_AVATAR =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9s2aLX4AAAAASUVORK5CYII=";

const VIEWPORTS = [
  { key: "320x568", width: 320, height: 568 },
  { key: "360x640", width: 360, height: 640 },
  { key: "375x667", width: 375, height: 667 },
  { key: "390x844", width: 390, height: 844 },
  { key: "414x896", width: 414, height: 896 },
  { key: "568x320", width: 568, height: 320 },
  { key: "640x360", width: 640, height: 360 },
  { key: "900x650", width: 900, height: 650 },
  { key: "768x1024", width: 768, height: 1024 },
  { key: "820x1180", width: 820, height: 1180 },
  { key: "1024x640", width: 1024, height: 640 },
  { key: "1024x768", width: 1024, height: 768 },
  { key: "1280x680", width: 1280, height: 680 },
  { key: "1280x800", width: 1280, height: 800 },
  { key: "1366x650", width: 1366, height: 650 },
  { key: "1366x768", width: 1366, height: 768 },
  { key: "1440x900", width: 1440, height: 900 },
  { key: "1536x864", width: 1536, height: 864 },
  { key: "1920x1080", width: 1920, height: 1080 },
  { key: "2440x1440", width: 2440, height: 1440 },
  { key: "3840x2160", width: 3840, height: 2160 },
];

const SCREENSHOT_VIEWPORT_KEYS = new Set([
  "320x568",
  "390x844",
  "768x1024",
  "1280x800",
  "1366x768",
  "1440x900",
  "1920x1080",
  "2440x1440",
  "3840x2160",
]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readEnvValue(filePath, key) {
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) {
      continue;
    }
    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }
    const currentKey = line.slice(0, separatorIndex).trim();
    if (currentKey !== key) {
      continue;
    }
    const rawValue = line.slice(separatorIndex + 1).trim();
    if (
      (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
      (rawValue.startsWith("'") && rawValue.endsWith("'"))
    ) {
      return rawValue.slice(1, -1);
    }
    return rawValue;
  }
  throw new Error(`Missing ${key} in ${filePath}`);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

async function waitFor(fn, timeoutMs, label) {
  const start = Date.now();
  let lastError = null;
  while (Date.now() - start < timeoutMs) {
    try {
      const value = await fn();
      if (value) {
        return value;
      }
    } catch (error) {
      lastError = error;
    }
    await sleep(250);
  }
  if (lastError) {
    throw lastError;
  }
  throw new Error(`Timed out while waiting for ${label}`);
}

class CdpClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.events = new Map();
  }

  async connect() {
    await new Promise((resolve, reject) => {
      this.ws.addEventListener("open", () => resolve(), { once: true });
      this.ws.addEventListener("error", reject, { once: true });
    });

    this.ws.addEventListener("message", (event) => {
      const payload = JSON.parse(event.data);
      if (payload.id) {
        const entry = this.pending.get(payload.id);
        if (!entry) {
          return;
        }
        this.pending.delete(payload.id);
        if (payload.error) {
          entry.reject(new Error(payload.error.message || "CDP request failed"));
          return;
        }
        entry.resolve(payload.result);
        return;
      }

      const listeners = this.events.get(payload.method) || [];
      for (const listener of listeners) {
        listener(payload.params || {});
      }
    });
  }

  on(method, handler) {
    const listeners = this.events.get(method) || [];
    listeners.push(handler);
    this.events.set(method, listeners);
  }

  send(method, params = {}) {
    const id = this.nextId++;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text || "Runtime evaluation failed");
    }
    return result.result.value;
  }

  async navigate(url) {
    await this.send("Page.navigate", { url });
  }

  async setViewport(width, height) {
    await this.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
      screenWidth: width,
      screenHeight: height,
      positionX: 0,
      positionY: 0,
      dontSetVisibleSize: false,
    });
    await this.send("Page.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
      screenWidth: width,
      screenHeight: height,
    }).catch(() => {});
  }

  async screenshot(filePath) {
    const { data } = await this.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
      fromSurface: true,
    });
    fs.writeFileSync(filePath, Buffer.from(data, "base64"));
  }

  close() {
    this.ws.close();
  }
}

async function connectBrowserPage(browserProcess) {
  const version = await waitFor(
    async () => {
      const response = await fetch(`http://127.0.0.1:${REMOTE_DEBUG_PORT}/json/version`);
      if (!response.ok) {
        return null;
      }
      return response.json();
    },
    15000,
    "remote debugger",
  );

  const targets = await waitFor(
    async () => {
      const response = await fetch(`http://127.0.0.1:${REMOTE_DEBUG_PORT}/json/list`);
      if (!response.ok) {
        return null;
      }
      const payload = await response.json();
      return Array.isArray(payload) && payload.length ? payload : null;
    },
    10000,
    "page target",
  );

  const pageTarget =
    targets.find((target) => target.type === "page") ||
    targets.find((target) => target.webSocketDebuggerUrl);
  if (!pageTarget) {
    throw new Error(`No page target found via ${version.Browser}`);
  }

  const client = new CdpClient(pageTarget.webSocketDebuggerUrl);
  await client.connect();
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("DOM.enable");
  await client.send("Network.enable");

  const loadState = { fired: false };
  client.on("Page.loadEventFired", () => {
    loadState.fired = true;
  });

  return {
    client,
    browserProcess,
    async waitForLoad() {
      await waitFor(() => loadState.fired, 15000, "page load");
      loadState.fired = false;
      await sleep(200);
    },
  };
}

function launchBrowser() {
  ensureDir(SCREENSHOT_DIR);
  ensureDir(USER_DATA_DIR);

  return spawn(
    EDGE_PATH,
    [
      "--headless=new",
      "--disable-gpu",
      "--disable-features=CalculateNativeWinOcclusion",
      `--remote-debugging-port=${REMOTE_DEBUG_PORT}`,
      `--user-data-dir=${USER_DATA_DIR}`,
      "about:blank",
    ],
    {
      stdio: "ignore",
      detached: false,
    },
  );
}

async function waitForText(client, text, timeoutMs = 20000) {
  const safeText = JSON.stringify(text);
  return waitFor(
    () =>
      client.evaluate(`
        (() => document.body && document.body.innerText.includes(${safeText}))()
      `),
    timeoutMs,
    `text ${text}`,
  );
}

async function clickByText(client, text) {
  const safeText = JSON.stringify(text);
  const point = await client.evaluate(`
    (() => {
      const normalize = (value) => String(value || "").replace(/\\s+/g, " ").trim();
      const candidates = Array.from(document.querySelectorAll("[role='button'], button, a, div, span"));
      const exact = candidates.find((element) => normalize(element.textContent) === ${safeText});
      const matched = exact || candidates.find((element) => normalize(element.textContent).includes(${safeText}));
      if (!matched) {
        return null;
      }
      const target = matched.closest("[role='button'], button, a") || matched;
      const rect = target.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    })()
  `);
  if (!point) {
    throw new Error(`Could not click element with text: ${text}`);
  }

  await client.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: point.x,
    y: point.y,
    button: "none",
  });
  await client.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: point.x,
    y: point.y,
    button: "left",
    clickCount: 1,
  });
  await client.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: point.x,
    y: point.y,
    button: "left",
    clickCount: 1,
  });
}

async function waitForPath(client, pathname, timeoutMs = 15000) {
  const safePath = JSON.stringify(pathname);
  return waitFor(
    () =>
      client.evaluate(`
        (() => window.location.pathname === ${safePath})()
      `),
    timeoutMs,
    `path ${pathname}`,
  );
}

async function waitForPathContains(client, value, timeoutMs = 15000) {
  const safeValue = JSON.stringify(value);
  return waitFor(
    () =>
      client.evaluate(`
        (() => window.location.pathname.includes(${safeValue}))()
      `),
    timeoutMs,
    `path containing ${value}`,
  );
}

async function readPath(client) {
  return client.evaluate("window.location.pathname");
}

async function readBodyText(client) {
  return client.evaluate(`
    (() => String(document.body ? document.body.innerText : "").trim())()
  `);
}

async function measureLayout(client) {
  return client.evaluate(`
    (() => {
      const doc = document.documentElement;
      const body = document.body;
      const scrollWidth = Math.max(doc ? doc.scrollWidth : 0, body ? body.scrollWidth : 0);
      const clientWidth = doc ? doc.clientWidth : 0;
      const scrollHeight = Math.max(doc ? doc.scrollHeight : 0, body ? body.scrollHeight : 0);
      const clientHeight = doc ? doc.clientHeight : 0;
      const overflowCandidates = Array.from(document.querySelectorAll("*"))
        .map((element) => {
          const style = window.getComputedStyle(element);
          const overflowY = style.overflowY;
          const overflowX = style.overflowX;
          const deltaY = element.scrollHeight - element.clientHeight;
          const deltaX = element.scrollWidth - element.clientWidth;
          return {
            tag: element.tagName,
            overflowY,
            overflowX,
            deltaY,
            deltaX,
            clientHeight: element.clientHeight,
            clientWidth: element.clientWidth,
          };
        })
        .filter((entry) =>
          (entry.overflowY === "auto" || entry.overflowY === "scroll" || entry.overflowY === "overlay") &&
          entry.clientHeight >= 120 &&
          entry.deltaY > 8,
        );
      const horizontalOverflowCandidates = Array.from(document.querySelectorAll("*"))
        .map((element) => {
          const style = window.getComputedStyle(element);
          const overflowX = style.overflowX;
          return {
            overflowX,
            clientWidth: element.clientWidth,
            deltaX: element.scrollWidth - element.clientWidth,
          };
        })
        .filter((entry) =>
          (entry.overflowX === "auto" || entry.overflowX === "scroll" || entry.overflowX === "overlay") &&
          entry.clientWidth >= 120 &&
          entry.deltaX > 4,
        );
      return {
        path: window.location.pathname,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        scrollWidth,
        clientWidth,
        scrollHeight,
        clientHeight,
        hasHorizontalOverflow: scrollWidth > clientWidth + 1,
        hasVerticalOverflowRegion: overflowCandidates.length > 0,
        verticalOverflowRegionCount: overflowCandidates.length,
        maxVerticalOverflowDelta: overflowCandidates.reduce((max, entry) => Math.max(max, entry.deltaY), 0),
        hasHorizontalOverflowRegion: horizontalOverflowCandidates.length > 0,
      };
    })()
  `);
}

async function recordScreenState(client, screenKey, report) {
  const results = [];
  for (const viewport of VIEWPORTS) {
    await client.setViewport(viewport.width, viewport.height);
    await sleep(300);
    const metrics = await measureLayout(client);
    let screenshotPath = null;
    if (SCREENSHOT_VIEWPORT_KEYS.has(viewport.key)) {
      const fileName = `${screenKey}-${viewport.key}.png`;
      screenshotPath = path.join(SCREENSHOT_DIR, fileName);
      await client.screenshot(screenshotPath);
    }
    results.push({
      viewport: viewport.key,
      width: viewport.width,
      height: viewport.height,
      path: metrics.path,
      scrollWidth: metrics.scrollWidth,
      clientWidth: metrics.clientWidth,
      scrollHeight: metrics.scrollHeight,
      clientHeight: metrics.clientHeight,
      hasHorizontalOverflow: metrics.hasHorizontalOverflow,
      hasVerticalOverflowRegion: metrics.hasVerticalOverflowRegion,
      verticalOverflowRegionCount: metrics.verticalOverflowRegionCount,
      maxVerticalOverflowDelta: metrics.maxVerticalOverflowDelta,
      hasHorizontalOverflowRegion: metrics.hasHorizontalOverflowRegion,
      screenshot: screenshotPath ? path.relative(path.resolve(__dirname, ".."), screenshotPath) : null,
    });
  }
  report.screens[screenKey] = results;
}

function createHostJwt() {
  const backendDir = path.resolve(__dirname, "..", "..", "beatbrain-backend");
  const envPath = path.join(backendDir, ".env");
  const sessionPath = path.join(backendDir, ".dev-host-session.json");
  const jwtSecret = readEnvValue(envPath, "JWT_SECRET");
  const session = JSON.parse(fs.readFileSync(sessionPath, "utf8"));

  return jwt.sign(
    {
      sub: session.spotifyUserId,
      email: session.email,
      role: "host",
    },
    jwtSecret,
    { expiresIn: "12h" },
  );
}

async function verifyHostJwt(hostJwt) {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${hostJwt}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Generated host JWT failed verification (${response.status})`);
  }
}

function createPlayerController(joinCode) {
  const socket = io(API_BASE_URL, {
    transports: ["websocket", "polling"],
  });

  const state = {
    currentQuestionPayload: null,
    firstQuestionResolve: null,
    firstRevealResolve: null,
    resultsResolve: null,
    autoAdvance: false,
  };

  const firstQuestion = new Promise((resolve) => {
    state.firstQuestionResolve = resolve;
  });
  const firstReveal = new Promise((resolve) => {
    state.firstRevealResolve = resolve;
  });
  const results = new Promise((resolve) => {
    state.resultsResolve = resolve;
  });

  socket.on("round:question", (payload) => {
    state.currentQuestionPayload = payload;
    if (state.firstQuestionResolve) {
      const resolve = state.firstQuestionResolve;
      state.firstQuestionResolve = null;
      resolve(payload);
      return;
    }

    if (state.autoAdvance) {
      const answer =
        payload?.question?.options?.[0] ||
        payload?.question?.correctAnswer ||
        "Test";
      socket.emit("player:answer", { joinCode, answer });
    }
  });

  socket.on("round:reveal", (payload) => {
    if (state.firstRevealResolve) {
      const resolve = state.firstRevealResolve;
      state.firstRevealResolve = null;
      resolve(payload);
      return;
    }

    if (state.autoAdvance) {
      setTimeout(() => {
        socket.emit("player:continue", { joinCode });
      }, 120);
    }
  });

  socket.on("game:ended", (payload) => {
    if (state.resultsResolve) {
      state.resultsResolve(payload);
      state.resultsResolve = null;
    }
  });

  return {
    socket,
    firstQuestion,
    firstReveal,
    results,
    enableAutoAdvance() {
      state.autoAdvance = true;
    },
    answerCurrentQuestion() {
      const answer =
        state.currentQuestionPayload?.question?.options?.[0] ||
        state.currentQuestionPayload?.question?.correctAnswer ||
        "Test";
      socket.emit("player:answer", { joinCode, answer });
    },
    continueRound() {
      socket.emit("player:continue", { joinCode });
    },
    async join() {
      await new Promise((resolve, reject) => {
        socket.on("connect", resolve);
        socket.on("connect_error", reject);
      });

      socket.emit("player:join", {
        joinCode,
        name: "Verifier",
        avatarDataUrl: DUMMY_AVATAR,
      });
      await sleep(400);
    },
    close() {
      socket.disconnect();
    },
  };
}

async function main() {
  ensureDir(SCREENSHOT_DIR);
  const report = {
    generatedAt: new Date().toISOString(),
    hostOrigin: HOST_ORIGIN,
    verificationMode: "host-preview-routes",
    viewports: VIEWPORTS,
    screens: {},
  };

  const browserProcess = launchBrowser();
  let page;
  const screenRoutes = {
    login: "/host/preview/login",
    lobby: "/host/preview/lobby",
    setup: "/host/preview/setup",
    create: "/host/preview/create",
    choose: "/host/preview/choose",
    "quiz-question": "/host/preview/quiz-question",
    "quiz-reveal": "/host/preview/quiz-reveal",
    results: "/host/preview/results",
  };

  try {
    page = await connectBrowserPage(browserProcess);
    const client = page.client;

    for (const [screenKey, route] of Object.entries(screenRoutes)) {
      await client.navigate(`${HOST_ORIGIN}${route}`);
      await page.waitForLoad();
      await waitForPath(client, route);
      await sleep(400);
      await recordScreenState(client, screenKey, report);
    }

    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

    const failures = Object.entries(report.screens).flatMap(([screenKey, values]) =>
      values.flatMap((entry) => {
        const issues = [];
        if (entry.hasHorizontalOverflow || entry.hasHorizontalOverflowRegion) {
          issues.push(`${screenKey}@${entry.viewport}:horizontal`);
        }
        if (entry.hasVerticalOverflowRegion) {
          issues.push(`${screenKey}@${entry.viewport}:vertical(${entry.maxVerticalOverflowDelta})`);
        }
        return issues;
      }),
    );

    console.log(JSON.stringify({
      reportPath: REPORT_PATH,
      failureCount: failures.length,
      failures,
    }, null, 2));

    if (failures.length) {
      process.exitCode = 1;
    }
  } finally {
    if (page) {
      page.client.close();
    }
    browserProcess.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
