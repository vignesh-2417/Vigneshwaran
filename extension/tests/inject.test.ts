import { afterEach, describe, expect, it } from "vitest";
import { waitFor } from "@testing-library/react";
import { HOST_ELEMENT_ID } from "@sfcopilot/shared";
import { injectAssistant, removeAssistant } from "../src/content/inject.js";

const lightningHost = "acme.lightning.force.com";

afterEach(() => {
  removeAssistant(document);
  document.documentElement.innerHTML = "";
});

describe("content script injection", () => {
  it("injects a single Shadow DOM host on an approved Salesforce domain", async () => {
    await injectAssistant(document, {
      hostname: lightningHost,
      isTop: true,
      useBackgroundApi: false
    });
    const host = document.getElementById(HOST_ELEMENT_ID);
    expect(host).not.toBeNull();
    expect(host?.shadowRoot).not.toBeNull();
    await waitFor(() => {
      const button = host?.shadowRoot?.querySelector(
        "button[aria-label='Salesforce Metadata Copilot']"
      );
      expect(button).not.toBeNull();
      expect(host?.shadowRoot?.querySelector("#sfcopilot-username")).not.toBeNull();
    });
  });

  it("does not inject on a non-Salesforce host", async () => {
    await injectAssistant(document, {
      hostname: "example.com",
      isTop: true,
      useBackgroundApi: false
    });
    expect(document.getElementById(HOST_ELEMENT_ID)).toBeNull();
  });

  it("does not create duplicate hosts on refresh-like re-injection", async () => {
    await injectAssistant(document, {
      hostname: lightningHost,
      isTop: true,
      useBackgroundApi: false
    });
    await injectAssistant(document, {
      hostname: lightningHost,
      isTop: true,
      useBackgroundApi: false
    });
    expect(document.querySelectorAll(`#${HOST_ELEMENT_ID}`)).toHaveLength(1);
  });

  it("does not create duplicate hosts after Lightning navigation", async () => {
    await injectAssistant(document, {
      hostname: lightningHost,
      isTop: true,
      useBackgroundApi: false
    });
    await injectAssistant(document, {
      hostname: lightningHost,
      isTop: true,
      useBackgroundApi: false
    });
    expect(document.querySelectorAll(`#${HOST_ELEMENT_ID}`)).toHaveLength(1);
  });

  it("does not inject into nested frames", async () => {
    await injectAssistant(document, {
      hostname: lightningHost,
      isTop: false,
      useBackgroundApi: false
    });
    expect(document.getElementById(HOST_ELEMENT_ID)).toBeNull();
  });
});
