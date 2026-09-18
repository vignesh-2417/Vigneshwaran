import { customFieldMetadataRecord, type ParsedCustomFieldRequest } from "@sfcopilot/shared";
import type { StoredSalesforceAuth } from "./authTypes.js";
import { extractSalesforceError, salesforceApiRequest, throwIfSalesforceFailed } from "./salesforceApi.js";
import { SalesforceApiError } from "./authTypes.js";

export function toolingCustomFieldPayload(field: ParsedCustomFieldRequest): {
  FullName: string;
  Metadata: Record<string, unknown>;
} {
  return {
    FullName: `${field.objectApiName}.${field.apiName}`,
    Metadata: customFieldMetadataRecord(field)
  };
}

export async function createCustomFieldWithAccessToken(
  auth: StoredSalesforceAuth,
  field: ParsedCustomFieldRequest,
  fetchImpl: typeof fetch = fetch
): Promise<{ id: string | null; created: boolean; alreadyExists: boolean; message: string }> {
  const response = await salesforceApiRequest(
    auth,
    "/tooling/sobjects/CustomField/",
    {
      method: "POST",
      body: JSON.stringify(toolingCustomFieldPayload(field))
    },
    fetchImpl
  );
  const raw: unknown = await response.json().catch(() => null);
  if (response.ok) {
    const id =
      raw && typeof raw === "object" && "id" in raw && typeof raw.id === "string" ? raw.id : null;
    return {
      id,
      created: true,
      alreadyExists: false,
      message: `Created ${field.objectApiName}.${field.apiName} in this org. Set FLS and page layouts in Setup.`
    };
  }
  const message = extractSalesforceError(raw) || `Salesforce rejected the field (${response.status}).`;
  if (isDuplicateCustomFieldError(message)) {
    return {
      id: null,
      created: false,
      alreadyExists: true,
      message: `${field.objectApiName}.${field.apiName} already exists in this org. Open Object Manager → ${field.objectApiName} → Fields & Relationships.`
    };
  }
  if (response.status === 401 || response.status === 403) {
    throwIfSalesforceFailed(response, raw);
  }
  if (response.status === 400) {
    throw new SalesforceApiError("validation", message, 400);
  }
  throwIfSalesforceFailed(response, raw);
  throw new SalesforceApiError("unknown", message, response.status);
}

export function isDuplicateCustomFieldError(message: string): boolean {
  return /already has a field|already exists|duplicate developer name|duplicate value/i.test(
    message
  );
}
