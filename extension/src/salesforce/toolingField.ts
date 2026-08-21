import { customFieldMetadataRecord, type ParsedCustomFieldRequest } from "@sfcopilot/shared";

const API_VERSION = "62.0";

export function toolingCustomFieldPayload(field: ParsedCustomFieldRequest): {
  FullName: string;
  Metadata: Record<string, unknown>;
} {
  return {
    FullName: `${field.objectApiName}.${field.apiName}`,
    Metadata: customFieldMetadataRecord(field)
  };
}

export async function createCustomFieldWithSession(
  instanceUrl: string,
  sessionId: string,
  field: ParsedCustomFieldRequest,
  fetchImpl: typeof fetch = fetch
): Promise<{ id: string | null; created: boolean; alreadyExists: boolean; message: string }> {
  const response = await fetchImpl(
    `${instanceUrl}/services/data/v${API_VERSION}/tooling/sobjects/CustomField/`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${sessionId}`
      },
      body: JSON.stringify(toolingCustomFieldPayload(field))
    }
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
  throw new Error(message.slice(0, 400));
}

export function isDuplicateCustomFieldError(message: string): boolean {
  return /already has a field|already exists|duplicate developer name|duplicate value/i.test(
    message
  );
}

function extractSalesforceError(raw: unknown): string | null {
  if (Array.isArray(raw) && raw[0] && typeof raw[0] === "object" && "message" in raw[0]) {
    const message = raw[0].message;
    return typeof message === "string" ? message : null;
  }
  if (raw && typeof raw === "object" && "message" in raw && typeof raw.message === "string") {
    return raw.message;
  }
  return null;
}
