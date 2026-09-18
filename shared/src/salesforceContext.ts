import { isApprovedSalesforceHost } from "./hosts.js";
import { ObjectApiNameSchema, SalesforceIdSchema } from "./schemas.js";
import type { Confidence, SalesforceContext } from "./schemas.js";

export interface LocationLike {
  hostname: string;
  href: string;
  pathname: string;
  hash: string;
  search: string;
}

const RECORD_PATH =
  /^\/lightning\/r\/([A-Za-z][A-Za-z0-9_]{0,79})\/([a-zA-Z0-9]{15,18})(?:\/|$)/;
const LIST_PATH = /^\/lightning\/o\/([A-Za-z][A-Za-z0-9_]{0,79})(?:\/|$)/;
const SETUP_PATH = /^\/lightning\/setup(?:\/|$)/;
const LIGHTNING_ROUTE = /^\/lightning(?:\/|$)/;
const ONE_APP_SOBJECT = /^#\/sObject\/([a-zA-Z0-9]{15,18})(?:\/|$)/;

function parseSalesforceId(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  const result = SalesforceIdSchema.safeParse(value);
  return result.success ? result.data : null;
}

function parseObjectApiName(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  const result = ObjectApiNameSchema.safeParse(value);
  return result.success ? result.data : null;
}

function stripUrlForContext(href: string): string {
  try {
    const url = new URL(href);
    url.search = "";
    url.hash = url.hash.startsWith("#/sObject/") ? url.hash : "";
    return url.toString();
  } catch {
    return href.slice(0, 2048);
  }
}

function lightningRoute(pathname: string, hash: string): string | null {
  if (LIGHTNING_ROUTE.test(pathname)) {
    return pathname;
  }
  if (pathname.includes("/one/one.app") && hash.startsWith("#/")) {
    return `${pathname}${hash}`;
  }
  return pathname.startsWith("/") ? pathname : null;
}

export interface ContextDetectionNote {
  objectApiName: string | null;
  recordId: string | null;
  explanation: string | null;
}

export function explainMissingContext(
  context: SalesforceContext
): ContextDetectionNote {
  const notes: string[] = [];
  if (context.objectApiName === null) {
    notes.push(
      "Object API name is unavailable because the URL is not a standard Lightning record or list path."
    );
  }
  if (context.recordId === null) {
    notes.push(
      "Record ID is unavailable because the URL does not contain a valid 15- or 18-character Salesforce ID."
    );
  }
  return {
    objectApiName: context.objectApiName,
    recordId: context.recordId,
    explanation: notes.length > 0 ? notes.join(" ") : null
  };
}

export function detectSalesforceContext(location: LocationLike): SalesforceContext {
  const hostname = location.hostname;
  const url = stripUrlForContext(location.href).slice(0, 2048);
  const approved = isApprovedSalesforceHost(hostname);

  if (!approved) {
    return {
      hostname,
      url,
      route: null,
      objectApiName: null,
      recordId: null,
      confidence: "low"
    };
  }

  const pathname = location.pathname;
  const recordMatch = RECORD_PATH.exec(pathname);
  if (recordMatch) {
    const objectApiName = parseObjectApiName(recordMatch[1]);
    const recordId = parseSalesforceId(recordMatch[2]);
    let confidence: Confidence = "low";
    if (objectApiName && recordId) {
      confidence = "high";
    } else if (objectApiName || recordId) {
      confidence = "medium";
    }
    return {
      hostname,
      url,
      route: lightningRoute(pathname, location.hash),
      objectApiName,
      recordId,
      confidence
    };
  }

  const listMatch = LIST_PATH.exec(pathname);
  if (listMatch) {
    const objectApiName = parseObjectApiName(listMatch[1]);
    return {
      hostname,
      url,
      route: lightningRoute(pathname, location.hash),
      objectApiName,
      recordId: null,
      confidence: objectApiName ? "medium" : "low"
    };
  }

  if (SETUP_PATH.test(pathname)) {
    return {
      hostname,
      url,
      route: lightningRoute(pathname, location.hash),
      objectApiName: null,
      recordId: null,
      confidence: "medium"
    };
  }

  const oneAppRecord = ONE_APP_SOBJECT.exec(location.hash);
  if (pathname.includes("/one/one.app") && oneAppRecord) {
    const recordId = parseSalesforceId(oneAppRecord[1]);
    return {
      hostname,
      url,
      route: lightningRoute(pathname, location.hash),
      objectApiName: null,
      recordId,
      confidence: recordId ? "medium" : "low"
    };
  }

  return {
    hostname,
    url,
    route: lightningRoute(pathname, location.hash),
    objectApiName: null,
    recordId: null,
    confidence: "low"
  };
}
