// @ts-nocheck
function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
import { expiredLoginUrl } from "./login-return";
import { recordTelemetryEvent } from "./telemetry";
import { SESSION_MUTATION_HEADERS } from "./session-request";
const CHANNEL_NAME = stryMutAct_9fa48("15484") ? "" : (stryCov_9fa48("15484"), "m6-session");
const LOGOUT_MESSAGE = stryMutAct_9fa48("15485") ? "" : (stryCov_9fa48("15485"), "logout");
const logoutCleanupListeners = new Set<() => void>();
export function registerSessionLogoutCleanup(cleanup: () => void): () => void {
  if (stryMutAct_9fa48("15486")) {
    {}
  } else {
    stryCov_9fa48("15486");
    if (stryMutAct_9fa48("15487")) {
      ;
    } else {
      stryCov_9fa48("15487");
      logoutCleanupListeners.add(cleanup);
    }
    return () => {
      if (stryMutAct_9fa48("15488")) {
        {}
      } else {
        stryCov_9fa48("15488");
        if (stryMutAct_9fa48("15489")) {
          ;
        } else {
          stryCov_9fa48("15489");
          logoutCleanupListeners.delete(cleanup);
        }
      }
    };
  }
}
function clearSessionClientState(): void {
  if (stryMutAct_9fa48("15490")) {
    {}
  } else {
    stryCov_9fa48("15490");
    logoutCleanupListeners.forEach(stryMutAct_9fa48("15492") ? () => undefined : (stryCov_9fa48("15492"), cleanup => cleanup()));
  }
}
let channel: BroadcastChannel | undefined;
function getChannel(): BroadcastChannel | undefined {
  if (stryMutAct_9fa48("15493")) {
    {}
  } else {
    stryCov_9fa48("15493");
    if (stryMutAct_9fa48("15496") ? typeof window === "undefined" && typeof BroadcastChannel === "undefined" : stryMutAct_9fa48("15495") ? false : stryMutAct_9fa48("15494") ? true : (stryCov_9fa48("15494", "15495", "15496"), (stryMutAct_9fa48("15498") ? typeof window !== "undefined" : stryMutAct_9fa48("15497") ? false : (stryCov_9fa48("15497", "15498"), typeof window === (stryMutAct_9fa48("15499") ? "" : (stryCov_9fa48("15499"), "undefined")))) || (stryMutAct_9fa48("15501") ? typeof BroadcastChannel !== "undefined" : stryMutAct_9fa48("15500") ? false : (stryCov_9fa48("15500", "15501"), typeof BroadcastChannel === (stryMutAct_9fa48("15502") ? "" : (stryCov_9fa48("15502"), "undefined")))))) return undefined;
    stryMutAct_9fa48("15503") ? channel &&= new BroadcastChannel(CHANNEL_NAME) : (stryCov_9fa48("15503"), channel ??= new BroadcastChannel(CHANNEL_NAME));
    return channel;
  }
}

/** `expired`: la sesión cayó sola (401), no la cerró la persona; el login avisa y retoma la pantalla. */
export async function broadcastLogout(options: {
  expired?: boolean;
} = {}): Promise<void> {
  if (stryMutAct_9fa48("15504")) {
    {}
  } else {
    stryCov_9fa48("15504");
    if (stryMutAct_9fa48("15505")) {
      ;
    } else {
      stryCov_9fa48("15505");
      clearSessionClientState();
    }
    try {
      if (stryMutAct_9fa48("15506")) {
        {}
      } else {
        stryCov_9fa48("15506");
        await fetch(stryMutAct_9fa48("15507") ? "" : (stryCov_9fa48("15507"), "/api/session/logout"), stryMutAct_9fa48("15508") ? {} : (stryCov_9fa48("15508"), {
          method: stryMutAct_9fa48("15509") ? "" : (stryCov_9fa48("15509"), "POST"),
          cache: stryMutAct_9fa48("15510") ? "" : (stryCov_9fa48("15510"), "no-store"),
          headers: SESSION_MUTATION_HEADERS,
          body: stryMutAct_9fa48("15511") ? "" : (stryCov_9fa48("15511"), "{}")
        }));
      }
    } catch {
      // Best-effort: every open tab still redirects to login regardless.
    }
    if (stryMutAct_9fa48("15512")) {
      ;
    } else {
      stryCov_9fa48("15512");
      completeSessionLogout(options);
    }
  }
}

/** Call after a caller has confirmed the server-side session cookie was cleared. */
export function finishSessionLogout(options: {
  expired?: boolean;
} = {}): void {
  if (stryMutAct_9fa48("15513")) {
    {}
  } else {
    stryCov_9fa48("15513");
    if (stryMutAct_9fa48("15514")) {
      ;
    } else {
      stryCov_9fa48("15514");
      clearSessionClientState();
    }
    if (stryMutAct_9fa48("15515")) {
      ;
    } else {
      stryCov_9fa48("15515");
      completeSessionLogout(options);
    }
  }
}
function completeSessionLogout(options: {
  expired?: boolean;
}): void {
  if (stryMutAct_9fa48("15516")) {
    {}
  } else {
    stryCov_9fa48("15516");
    recordTelemetryEvent(stryMutAct_9fa48("15518") ? {} : (stryCov_9fa48("15518"), {
      name: stryMutAct_9fa48("15519") ? "" : (stryCov_9fa48("15519"), "auth_logout_broadcast")
    }));
    stryMutAct_9fa48("15520") ? getChannel().postMessage(LOGOUT_MESSAGE) : (stryCov_9fa48("15520"), getChannel()?.postMessage(LOGOUT_MESSAGE));
    if (stryMutAct_9fa48("15523") ? typeof window === "undefined" : stryMutAct_9fa48("15522") ? false : stryMutAct_9fa48("15521") ? true : (stryCov_9fa48("15521", "15522", "15523"), typeof window !== (stryMutAct_9fa48("15524") ? "" : (stryCov_9fa48("15524"), "undefined")))) window.location.assign(options.expired ? expiredLoginUrl(window.location) : stryMutAct_9fa48("15526") ? "" : (stryCov_9fa48("15526"), "/login"));
  }
}
export function onRemoteLogout(callback: () => void): () => void {
  if (stryMutAct_9fa48("15527")) {
    {}
  } else {
    stryCov_9fa48("15527");
    const activeChannel = getChannel();
    if (stryMutAct_9fa48("15530") ? false : stryMutAct_9fa48("15529") ? true : stryMutAct_9fa48("15528") ? activeChannel : (stryCov_9fa48("15528", "15529", "15530"), !activeChannel)) return () => undefined;
    const handleMessage = (event: MessageEvent) => {
      if (stryMutAct_9fa48("15531")) {
        {}
      } else {
        stryCov_9fa48("15531");
        if (stryMutAct_9fa48("15534") ? event.data !== LOGOUT_MESSAGE : stryMutAct_9fa48("15533") ? false : stryMutAct_9fa48("15532") ? true : (stryCov_9fa48("15532", "15533", "15534"), event.data === LOGOUT_MESSAGE)) {
          if (stryMutAct_9fa48("15535")) {
            {}
          } else {
            stryCov_9fa48("15535");
            if (stryMutAct_9fa48("15536")) {
              ;
            } else {
              stryCov_9fa48("15536");
              clearSessionClientState();
            }
            if (stryMutAct_9fa48("15537")) {
              ;
            } else {
              stryCov_9fa48("15537");
              callback();
            }
          }
        }
      }
    };
    activeChannel.addEventListener(stryMutAct_9fa48("15539") ? "" : (stryCov_9fa48("15539"), "message"), handleMessage);
    return stryMutAct_9fa48("15540") ? () => undefined : (stryCov_9fa48("15540"), () => activeChannel.removeEventListener(stryMutAct_9fa48("15541") ? "" : (stryCov_9fa48("15541"), "message"), handleMessage));
  }
}