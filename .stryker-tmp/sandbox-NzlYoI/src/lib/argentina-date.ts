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
const ARGENTINA_TIME_ZONE = stryMutAct_9fa48("6768") ? "" : (stryCov_9fa48("6768"), "America/Argentina/Buenos_Aires");

// en-CA formats dates as YYYY-MM-DD.
const dayFormatter = new Intl.DateTimeFormat(stryMutAct_9fa48("6769") ? "" : (stryCov_9fa48("6769"), "en-CA"), stryMutAct_9fa48("6770") ? {} : (stryCov_9fa48("6770"), {
  timeZone: ARGENTINA_TIME_ZONE,
  year: stryMutAct_9fa48("6771") ? "" : (stryCov_9fa48("6771"), "numeric"),
  month: stryMutAct_9fa48("6772") ? "" : (stryCov_9fa48("6772"), "2-digit"),
  day: stryMutAct_9fa48("6773") ? "" : (stryCov_9fa48("6773"), "2-digit")
}));

// Argentina no tiene horario de verano: su hora es siempre UTC-3.
const ARGENTINA_OFFSET = stryMutAct_9fa48("6774") ? "" : (stryCov_9fa48("6774"), "-03:00");
const ZONELESS_LOCAL_DATE_TIME = stryMutAct_9fa48("6792") ? /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\D+)?)?$/ : stryMutAct_9fa48("6791") ? /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d)?)?$/ : stryMutAct_9fa48("6790") ? /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+))?$/ : stryMutAct_9fa48("6789") ? /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\D{2}(\.\d+)?)?$/ : stryMutAct_9fa48("6788") ? /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d(\.\d+)?)?$/ : stryMutAct_9fa48("6787") ? /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)$/ : stryMutAct_9fa48("6786") ? /^\d{4}-\d{2}-\d{2}T\d{2}:\D{2}(:\d{2}(\.\d+)?)?$/ : stryMutAct_9fa48("6785") ? /^\d{4}-\d{2}-\d{2}T\d{2}:\d(:\d{2}(\.\d+)?)?$/ : stryMutAct_9fa48("6784") ? /^\d{4}-\d{2}-\d{2}T\D{2}:\d{2}(:\d{2}(\.\d+)?)?$/ : stryMutAct_9fa48("6783") ? /^\d{4}-\d{2}-\d{2}T\d:\d{2}(:\d{2}(\.\d+)?)?$/ : stryMutAct_9fa48("6782") ? /^\d{4}-\d{2}-\D{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/ : stryMutAct_9fa48("6781") ? /^\d{4}-\d{2}-\dT\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/ : stryMutAct_9fa48("6780") ? /^\d{4}-\D{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/ : stryMutAct_9fa48("6779") ? /^\d{4}-\d-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/ : stryMutAct_9fa48("6778") ? /^\D{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/ : stryMutAct_9fa48("6777") ? /^\d-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/ : stryMutAct_9fa48("6776") ? /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?/ : stryMutAct_9fa48("6775") ? /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/ : (stryCov_9fa48("6775", "6776", "6777", "6778", "6779", "6780", "6781", "6782", "6783", "6784", "6785", "6786", "6787", "6788", "6789", "6790", "6791", "6792"), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/);

/**
 * Agrega `-03:00` a una fecha y hora local sin zona (`YYYY-MM-DDTHH:mm[:ss[.sss]]`), para que el
 * backend no la lea en la zona de su servidor. Un valor con `Z` u offset, o que no sea una
 * fecha y hora local, se devuelve tal cual.
 */
export function withArgentinaOffset(value: string): string {
  if (stryMutAct_9fa48("6793")) {
    {}
  } else {
    stryCov_9fa48("6793");
    return ZONELESS_LOCAL_DATE_TIME.test(value) ? stryMutAct_9fa48("6794") ? `` : (stryCov_9fa48("6794"), `${value}${ARGENTINA_OFFSET}`) : value;
  }
}

/** Fecha (YYYY-MM-DD) de un instante en la zona horaria de Argentina. */
export function todayInArgentina(now: Date = new Date()): string {
  if (stryMutAct_9fa48("6795")) {
    {}
  } else {
    stryCov_9fa48("6795");
    return dayFormatter.format(now);
  }
}

/** Día argentino (YYYY-MM-DD) de un timestamp ISO, o null si no es una fecha válida. */
export function argentinaDay(value: string): string | null {
  if (stryMutAct_9fa48("6796")) {
    {}
  } else {
    stryCov_9fa48("6796");
    const instant = new Date(value);
    return Number.isNaN(instant.getTime()) ? null : dayFormatter.format(instant);
  }
}

// Una fecha de calendario no tiene hora: se formatea en UTC para que no corra de día.
const calendarDayLabelFormatter = new Intl.DateTimeFormat(stryMutAct_9fa48("6797") ? "" : (stryCov_9fa48("6797"), "es-AR"), stryMutAct_9fa48("6798") ? {} : (stryCov_9fa48("6798"), {
  dateStyle: stryMutAct_9fa48("6799") ? "" : (stryCov_9fa48("6799"), "medium"),
  timeZone: stryMutAct_9fa48("6800") ? "" : (stryCov_9fa48("6800"), "UTC")
}));
const dateTimeLabelFormatter = new Intl.DateTimeFormat(stryMutAct_9fa48("6801") ? "" : (stryCov_9fa48("6801"), "es-AR"), stryMutAct_9fa48("6802") ? {} : (stryCov_9fa48("6802"), {
  dateStyle: stryMutAct_9fa48("6803") ? "" : (stryCov_9fa48("6803"), "medium"),
  timeStyle: stryMutAct_9fa48("6804") ? "" : (stryCov_9fa48("6804"), "short"),
  timeZone: ARGENTINA_TIME_ZONE
}));
const numericCalendarDateFormatter = new Intl.DateTimeFormat(stryMutAct_9fa48("6805") ? "" : (stryCov_9fa48("6805"), "es-AR"), stryMutAct_9fa48("6806") ? {} : (stryCov_9fa48("6806"), {
  day: stryMutAct_9fa48("6807") ? "" : (stryCov_9fa48("6807"), "2-digit"),
  month: stryMutAct_9fa48("6808") ? "" : (stryCov_9fa48("6808"), "2-digit"),
  year: stryMutAct_9fa48("6809") ? "" : (stryCov_9fa48("6809"), "numeric"),
  timeZone: stryMutAct_9fa48("6810") ? "" : (stryCov_9fa48("6810"), "UTC")
}));
const numericDateTimeFormatter = new Intl.DateTimeFormat(stryMutAct_9fa48("6811") ? "" : (stryCov_9fa48("6811"), "es-AR"), stryMutAct_9fa48("6812") ? {} : (stryCov_9fa48("6812"), {
  day: stryMutAct_9fa48("6813") ? "" : (stryCov_9fa48("6813"), "2-digit"),
  month: stryMutAct_9fa48("6814") ? "" : (stryCov_9fa48("6814"), "2-digit"),
  year: stryMutAct_9fa48("6815") ? "" : (stryCov_9fa48("6815"), "numeric"),
  hour: stryMutAct_9fa48("6816") ? "" : (stryCov_9fa48("6816"), "2-digit"),
  minute: stryMutAct_9fa48("6817") ? "" : (stryCov_9fa48("6817"), "2-digit"),
  hourCycle: stryMutAct_9fa48("6818") ? "" : (stryCov_9fa48("6818"), "h23"),
  timeZone: ARGENTINA_TIME_ZONE
}));

/**
 * "7 dic 2026" para una fecha de calendario: acepta YYYY-MM-DD o el ISO a medianoche
 * UTC con el que el backend serializa un `@db.Date`. Si no es una fecha, la devuelve tal cual.
 */
export function formatCalendarDay(value: string): string {
  if (stryMutAct_9fa48("6819")) {
    {}
  } else {
    stryCov_9fa48("6819");
    const day = stryMutAct_9fa48("6820") ? value : (stryCov_9fa48("6820"), value.slice(0, 10));
    const date = new Date(stryMutAct_9fa48("6821") ? `` : (stryCov_9fa48("6821"), `${day}T00:00:00Z`));
    const isCalendarDay = stryMutAct_9fa48("6824") ? /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) === day : stryMutAct_9fa48("6823") ? false : stryMutAct_9fa48("6822") ? true : (stryCov_9fa48("6822", "6823", "6824"), (stryMutAct_9fa48("6826") ? /^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isNaN(date.getTime()) : stryMutAct_9fa48("6825") ? true : (stryCov_9fa48("6825", "6826"), (stryMutAct_9fa48("6834") ? /^\d{4}-\d{2}-\D{2}$/ : stryMutAct_9fa48("6833") ? /^\d{4}-\d{2}-\d$/ : stryMutAct_9fa48("6832") ? /^\d{4}-\D{2}-\d{2}$/ : stryMutAct_9fa48("6831") ? /^\d{4}-\d-\d{2}$/ : stryMutAct_9fa48("6830") ? /^\D{4}-\d{2}-\d{2}$/ : stryMutAct_9fa48("6829") ? /^\d-\d{2}-\d{2}$/ : stryMutAct_9fa48("6828") ? /^\d{4}-\d{2}-\d{2}/ : stryMutAct_9fa48("6827") ? /\d{4}-\d{2}-\d{2}$/ : (stryCov_9fa48("6827", "6828", "6829", "6830", "6831", "6832", "6833", "6834"), /^\d{4}-\d{2}-\d{2}$/)).test(day) && (stryMutAct_9fa48("6835") ? Number.isNaN(date.getTime()) : (stryCov_9fa48("6835"), !Number.isNaN(date.getTime()))))) && (stryMutAct_9fa48("6837") ? date.toISOString().slice(0, 10) !== day : stryMutAct_9fa48("6836") ? true : (stryCov_9fa48("6836", "6837"), (stryMutAct_9fa48("6838") ? date.toISOString() : (stryCov_9fa48("6838"), date.toISOString().slice(0, 10))) === day)));
    return isCalendarDay ? calendarDayLabelFormatter.format(date) : value;
  }
}

/** "05/09/2026" for a calendar day or its UTC-midnight backend representation. */
export function formatArgentinaCalendarDate(value: string): string {
  if (stryMutAct_9fa48("6839")) {
    {}
  } else {
    stryCov_9fa48("6839");
    const day = stryMutAct_9fa48("6840") ? value : (stryCov_9fa48("6840"), value.slice(0, 10));
    const date = new Date(stryMutAct_9fa48("6841") ? `` : (stryCov_9fa48("6841"), `${day}T00:00:00Z`));
    const isCalendarDay = stryMutAct_9fa48("6844") ? /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) === day : stryMutAct_9fa48("6843") ? false : stryMutAct_9fa48("6842") ? true : (stryCov_9fa48("6842", "6843", "6844"), (stryMutAct_9fa48("6846") ? /^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isNaN(date.getTime()) : stryMutAct_9fa48("6845") ? true : (stryCov_9fa48("6845", "6846"), (stryMutAct_9fa48("6854") ? /^\d{4}-\d{2}-\D{2}$/ : stryMutAct_9fa48("6853") ? /^\d{4}-\d{2}-\d$/ : stryMutAct_9fa48("6852") ? /^\d{4}-\D{2}-\d{2}$/ : stryMutAct_9fa48("6851") ? /^\d{4}-\d-\d{2}$/ : stryMutAct_9fa48("6850") ? /^\D{4}-\d{2}-\d{2}$/ : stryMutAct_9fa48("6849") ? /^\d-\d{2}-\d{2}$/ : stryMutAct_9fa48("6848") ? /^\d{4}-\d{2}-\d{2}/ : stryMutAct_9fa48("6847") ? /\d{4}-\d{2}-\d{2}$/ : (stryCov_9fa48("6847", "6848", "6849", "6850", "6851", "6852", "6853", "6854"), /^\d{4}-\d{2}-\d{2}$/)).test(day) && (stryMutAct_9fa48("6855") ? Number.isNaN(date.getTime()) : (stryCov_9fa48("6855"), !Number.isNaN(date.getTime()))))) && (stryMutAct_9fa48("6857") ? date.toISOString().slice(0, 10) !== day : stryMutAct_9fa48("6856") ? true : (stryCov_9fa48("6856", "6857"), (stryMutAct_9fa48("6858") ? date.toISOString() : (stryCov_9fa48("6858"), date.toISOString().slice(0, 10))) === day)));
    return isCalendarDay ? numericCalendarDateFormatter.format(date) : value;
  }
}

/** "22 sept 2026, 10:43 a. m." en hora argentina. Si no es una fecha, la devuelve tal cual. */
export function formatArgentinaDateTime(value: string): string {
  if (stryMutAct_9fa48("6859")) {
    {}
  } else {
    stryCov_9fa48("6859");
    if (stryMutAct_9fa48("6861") ? false : stryMutAct_9fa48("6860") ? true : (stryCov_9fa48("6860", "6861"), (stryMutAct_9fa48("6869") ? /^\d{4}-\d{2}-\D{2}$/ : stryMutAct_9fa48("6868") ? /^\d{4}-\d{2}-\d$/ : stryMutAct_9fa48("6867") ? /^\d{4}-\D{2}-\d{2}$/ : stryMutAct_9fa48("6866") ? /^\d{4}-\d-\d{2}$/ : stryMutAct_9fa48("6865") ? /^\D{4}-\d{2}-\d{2}$/ : stryMutAct_9fa48("6864") ? /^\d-\d{2}-\d{2}$/ : stryMutAct_9fa48("6863") ? /^\d{4}-\d{2}-\d{2}/ : stryMutAct_9fa48("6862") ? /\d{4}-\d{2}-\d{2}$/ : (stryCov_9fa48("6862", "6863", "6864", "6865", "6866", "6867", "6868", "6869"), /^\d{4}-\d{2}-\d{2}$/)).test(value))) return formatCalendarDay(value);
    const instant = new Date(value);
    return Number.isNaN(instant.getTime()) ? value : dateTimeLabelFormatter.format(instant);
  }
}

/** "22/09/2026, 10:43" in Argentina time, using a 24-hour clock. */
export function formatArgentinaNumericDateTime(value: string): string {
  if (stryMutAct_9fa48("6870")) {
    {}
  } else {
    stryCov_9fa48("6870");
    if (stryMutAct_9fa48("6872") ? false : stryMutAct_9fa48("6871") ? true : (stryCov_9fa48("6871", "6872"), (stryMutAct_9fa48("6880") ? /^\d{4}-\d{2}-\D{2}$/ : stryMutAct_9fa48("6879") ? /^\d{4}-\d{2}-\d$/ : stryMutAct_9fa48("6878") ? /^\d{4}-\D{2}-\d{2}$/ : stryMutAct_9fa48("6877") ? /^\d{4}-\d-\d{2}$/ : stryMutAct_9fa48("6876") ? /^\D{4}-\d{2}-\d{2}$/ : stryMutAct_9fa48("6875") ? /^\d-\d{2}-\d{2}$/ : stryMutAct_9fa48("6874") ? /^\d{4}-\d{2}-\d{2}/ : stryMutAct_9fa48("6873") ? /\d{4}-\d{2}-\d{2}$/ : (stryCov_9fa48("6873", "6874", "6875", "6876", "6877", "6878", "6879", "6880"), /^\d{4}-\d{2}-\d{2}$/)).test(value))) return formatArgentinaCalendarDate(value);
    const instant = new Date(value);
    return Number.isNaN(instant.getTime()) ? value : numericDateTimeFormatter.format(instant);
  }
}