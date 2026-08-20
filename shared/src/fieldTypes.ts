export const FIELD_TYPE_CATEGORIES = [
  "Text and numeric",
  "Selection",
  "Specialized",
  "Structural and dynamic",
  "Relationship"
] as const;

export type FieldTypeCategory = (typeof FIELD_TYPE_CATEGORIES)[number];

/** Salesforce CustomField <type> values, plus Formula which uses a return type in XML. */
export type FieldCatalogId =
  | "Text"
  | "TextArea"
  | "LongTextArea"
  | "Html"
  | "EncryptedText"
  | "Number"
  | "Percent"
  | "Currency"
  | "Picklist"
  | "MultiselectPicklist"
  | "Checkbox"
  | "Email"
  | "Phone"
  | "Url"
  | "Date"
  | "DateTime"
  | "AutoNumber"
  | "Formula"
  | "Summary"
  | "Lookup"
  | "MasterDetail"
  | "ExternalLookup";

export interface FieldTypeDefinition {
  id: FieldCatalogId;
  /** Value written to CustomField <type>, except Formula which uses formulaReturnType. */
  metadataType: Exclude<FieldCatalogId, "Formula"> | null;
  label: string;
  category: FieldTypeCategory;
  summary: string;
  aliases: readonly string[];
}

export const FIELD_TYPE_CATALOG: readonly FieldTypeDefinition[] = [
  {
    id: "Text",
    metadataType: "Text",
    label: "Text",
    category: "Text and numeric",
    summary: "Letters, numbers, or symbols up to 255 characters.",
    aliases: ["string", "text field"]
  },
  {
    id: "TextArea",
    metadataType: "TextArea",
    label: "Text Area",
    category: "Text and numeric",
    summary: "Up to 255 characters across multiple lines.",
    aliases: ["textarea", "text-area"]
  },
  {
    id: "LongTextArea",
    metadataType: "LongTextArea",
    label: "Text Area (Long)",
    category: "Text and numeric",
    summary: "Up to 131,072 characters on separate lines.",
    aliases: ["long text", "long textarea", "long text area"]
  },
  {
    id: "Html",
    metadataType: "Html",
    label: "Text Area (Rich)",
    category: "Text and numeric",
    summary: "Formatted text, images, and links (rich text / HTML).",
    aliases: ["rich text", "rich textarea", "html", "rich text area"]
  },
  {
    id: "EncryptedText",
    metadataType: "EncryptedText",
    label: "Text (Encrypted)",
    category: "Text and numeric",
    summary: "Encrypted text up to 175 characters. Mask metadata only; never store secrets in source.",
    aliases: ["encrypted", "encrypted text"]
  },
  {
    id: "Number",
    metadataType: "Number",
    label: "Number",
    category: "Text and numeric",
    summary: "Integer or decimal values up to 18 digits total.",
    aliases: ["integer", "numeric"]
  },
  {
    id: "Percent",
    metadataType: "Percent",
    label: "Percent",
    category: "Text and numeric",
    summary: "Decimal values displayed with a percent sign.",
    aliases: ["percentage"]
  },
  {
    id: "Currency",
    metadataType: "Currency",
    label: "Currency",
    category: "Text and numeric",
    summary: "Monetary amounts using the org currency symbol.",
    aliases: ["money"]
  },
  {
    id: "Picklist",
    metadataType: "Picklist",
    label: "Picklist",
    category: "Selection",
    summary: "Single value from a predefined list.",
    aliases: ["drop down", "dropdown"]
  },
  {
    id: "MultiselectPicklist",
    metadataType: "MultiselectPicklist",
    label: "Picklist (Multi-Select)",
    category: "Selection",
    summary: "Multiple values stored as semicolon-delimited text.",
    aliases: ["multi-select", "multiselect", "multi select picklist"]
  },
  {
    id: "Checkbox",
    metadataType: "Checkbox",
    label: "Checkbox",
    category: "Selection",
    summary: "True/false boolean toggle.",
    aliases: ["boolean", "checkbox field"]
  },
  {
    id: "Email",
    metadataType: "Email",
    label: "Email",
    category: "Specialized",
    summary: "Validates a standard email address format.",
    aliases: ["e-mail"]
  },
  {
    id: "Phone",
    metadataType: "Phone",
    label: "Phone",
    category: "Specialized",
    summary: "Telephone numbers; client apps own final formatting.",
    aliases: ["telephone"]
  },
  {
    id: "Url",
    metadataType: "Url",
    label: "URL",
    category: "Specialized",
    summary: "Web address stored and displayed as a hyperlink.",
    aliases: ["hyperlink", "website"]
  },
  {
    id: "Date",
    metadataType: "Date",
    label: "Date",
    category: "Specialized",
    summary: "Calendar day, month, and year.",
    aliases: []
  },
  {
    id: "DateTime",
    metadataType: "DateTime",
    label: "Date/Time",
    category: "Specialized",
    summary: "Calendar date plus a time of day.",
    aliases: ["datetime", "date time", "date-time"]
  },
  {
    id: "AutoNumber",
    metadataType: "AutoNumber",
    label: "Auto Number",
    category: "Specialized",
    summary: "System-generated sequential number using an admin format.",
    aliases: ["autonumber", "auto-number"]
  },
  {
    id: "Formula",
    metadataType: null,
    label: "Formula",
    category: "Structural and dynamic",
    summary: "Read-only calculated value from an expression.",
    aliases: ["calculated"]
  },
  {
    id: "Summary",
    metadataType: "Summary",
    label: "Roll-Up Summary",
    category: "Structural and dynamic",
    summary: "Aggregates child records on a master-detail parent (COUNT, SUM, MIN, MAX).",
    aliases: ["rollup", "roll-up", "roll up summary"]
  },
  {
    id: "Lookup",
    metadataType: "Lookup",
    label: "Lookup Relationship",
    category: "Relationship",
    summary: "Loose foreign-key link to another object.",
    aliases: ["lookup field"]
  },
  {
    id: "MasterDetail",
    metadataType: "MasterDetail",
    label: "Master-Detail Relationship",
    category: "Relationship",
    summary: "Tight parent-child link; master controls delete, sharing, and visibility.",
    aliases: ["master detail", "master-detail"]
  },
  {
    id: "ExternalLookup",
    metadataType: "ExternalLookup",
    label: "External Lookup Relationship",
    category: "Relationship",
    summary: "Link to an external object whose data lives outside Salesforce.",
    aliases: ["external lookup"]
  }
];

export const FIELD_TYPE_GROUPS = FIELD_TYPE_CATEGORIES.map((category) => ({
  category,
  types: FIELD_TYPE_CATALOG.filter((entry) => entry.category === category)
}));

export function findFieldTypeDefinition(raw: string): FieldTypeDefinition | undefined {
  const normalized = raw.trim().toLowerCase().replace(/\s+/g, " ");
  return FIELD_TYPE_CATALOG.find((entry) => {
    if (entry.id.toLowerCase() === normalized) {
      return true;
    }
    if (entry.label.toLowerCase() === normalized) {
      return true;
    }
    if (entry.metadataType && entry.metadataType.toLowerCase() === normalized) {
      return true;
    }
    return entry.aliases.some((alias) => alias.toLowerCase() === normalized);
  });
}
