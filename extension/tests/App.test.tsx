import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import type { AnalyzeResponse, SalesforceContext } from "@sfcopilot/shared";
import { MockAssistantApi } from "../src/api/assistantApi.js";
import { analyzeRequirementLocally } from "../src/api/localAnalyze.js";
import { CopilotApp } from "../src/ui/App.js";

const context: SalesforceContext = {
  hostname: "acme.lightning.force.com",
  url: "https://acme.lightning.force.com/lightning/r/Account/001xx000003DGbYAAW/view",
  route: "/lightning/r/Account/001xx000003DGbYAAW/view",
  objectApiName: "Account",
  recordId: "001xx000003DGbYAAW",
  confidence: "high"
};

function renderApp(
  api: MockAssistantApi = new MockAssistantApi(analyzeRequirementLocally),
  initialOpen = false
) {
  return render(
    <CopilotApp api={api} getContext={() => context} initialOpen={initialOpen} />
  );
}

async function signIn(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Salesforce username"), "user@example.com");
  await user.type(screen.getByLabelText("Password"), "not-a-real-password");
  await user.click(screen.getByRole("button", { name: "Sign in" }));
  await user.click(await screen.findByRole("button", { name: "OK" }));
}

afterEach(() => {
  cleanup();
});

describe("assistant panel", () => {
  it("opens and closes from the floating icon and close button", async () => {
    const user = userEvent.setup();
    renderApp();
    const icon = screen.getByRole("button", { name: "Salesforce Metadata Copilot" });
    await user.click(icon);
    expect(screen.getByRole("dialog", { name: "Salesforce Metadata Copilot" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close assistant" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("asks for Salesforce credentials as soon as the lava icon appears", async () => {
    const user = userEvent.setup();
    renderApp();
    expect(screen.getByLabelText("Salesforce username")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Salesforce username"), "user@example.com");
    await user.type(screen.getByLabelText("Password"), "not-a-real-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await user.click(await screen.findByRole("button", { name: "OK" }));
    expect(screen.queryByLabelText("Salesforce username")).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Salesforce Metadata Copilot" })).toBeInTheDocument();
  });

  it("requires login before creating metadata", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("button", { name: "Salesforce Metadata Copilot" }));
    await user.click(screen.getByRole("checkbox"));
    await user.type(
      screen.getByLabelText("Salesforce requirement"),
      'Create a custom text field "COP Text" in Account object'
    );
    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/Sign in with Salesforce credentials/);
  });

  it("shows an error for an empty request", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("button", { name: "Salesforce Metadata Copilot" }));
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/Enter a Salesforce requirement/);
  });

  it("shows a loading state while analyzing", async () => {
    const user = userEvent.setup();
    let release: () => void = () => undefined;
    const deferred = new Promise<AnalyzeResponse>((resolve) => {
      release = () => {
        void analyzeRequirementLocally(
          "Create a Customer Tier picklist field on Account with Gold, Silver, and Bronze values.",
          context
        ).then(resolve);
      };
    });
    renderApp(new MockAssistantApi(() => deferred));
    await user.click(screen.getByRole("button", { name: "Salesforce Metadata Copilot" }));
    await signIn(user);
    await user.click(screen.getByRole("checkbox"));
    await user.type(
      screen.getByLabelText("Salesforce requirement"),
      "Create a Customer Tier picklist field on Account with Gold, Silver, and Bronze values."
    );
    await user.click(screen.getByRole("button", { name: "Run ANALYZE" }));
    expect(screen.getByRole("status")).toHaveTextContent(/Processing ANALYZE/);
    release();
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
  });

  it("shows an error state when analysis fails", async () => {
    const user = userEvent.setup();
    renderApp(
      new MockAssistantApi(async () => ({
        ok: false,
        correlationId: "11111111-1111-4111-8111-111111111111",
        code: "INTERNAL_ERROR",
        message: "Mock backend unavailable"
      }))
    );
    await user.click(screen.getByRole("button", { name: "Salesforce Metadata Copilot" }));
    await signIn(user);
    await user.click(screen.getByRole("checkbox"));
    await user.type(screen.getByLabelText("Salesforce requirement"), "Create a Customer Tier field");
    await user.click(screen.getByRole("button", { name: "Run ANALYZE" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Mock backend unavailable");
  });

  it("renders mock clarifying questions, plan, metadata, and validation", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("button", { name: "Salesforce Metadata Copilot" }));
    await signIn(user);
    await user.click(screen.getByRole("checkbox"));
    await user.type(
      screen.getByLabelText("Salesforce requirement"),
      "Create a Customer Tier picklist field on Account with Gold, Silver, and Bronze values."
    );
    await user.click(screen.getByRole("button", { name: "Run ANALYZE" }));
    expect(await screen.findByRole("region", { name: "Current prompt" })).toHaveTextContent(
      "Create a Customer Tier picklist field on Account with Gold, Silver, and Bronze values."
    );
    expect(await screen.findByRole("region", { name: "Required output" })).toBeInTheDocument();
    expect(await screen.findByRole("region", { name: "Implementation plan" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Metadata diff" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Validation results" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create field in this org" })).toBeEnabled();
  });

  it("creates the reviewed field in the org after ANALYZE", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("button", { name: "Salesforce Metadata Copilot" }));
    await signIn(user);
    await user.click(screen.getByLabelText(/I understand Salesforce page context/));
    await user.type(
      screen.getByLabelText("Salesforce requirement"),
      'Field data type: Currency. Create currency field "COPruppes" on Account object'
    );
    await user.click(screen.getByRole("button", { name: "Run ANALYZE" }));
    await screen.findByRole("region", { name: "Metadata diff" });
    await user.click(screen.getByRole("button", { name: "Create field in this org" }));
    expect(await screen.findByText(/Created Account\.COPruppes__c|Created Account\.Field/i)).toBeInTheDocument();
  });

  it("lists every Salesforce field data type in the composer", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("button", { name: "Salesforce Metadata Copilot" }));
    expect(screen.getByLabelText("Field data type")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Text Area (Rich)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Picklist (Multi-Select)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Roll-Up Summary" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "External Lookup Relationship" })).toBeInTheDocument();
  });

  it("supports keyboard activation of the floating icon", async () => {
    const user = userEvent.setup();
    renderApp();
    const icon = screen.getByRole("button", { name: "Salesforce Metadata Copilot" });
    icon.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
