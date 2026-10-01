import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import {
  getStorefrontSetupCompletion,
  StorefrontSetupGuide,
} from "../storefront-setup-guide";

describe("getStorefrontSetupCompletion", () => {
  it("keeps each storefront requirement independent", () => {
    expect(
      getStorefrontSetupCompletion({
        storeEnabled: true,
        hasLogo: false,
        detailsComplete: false,
        hasListableProduct: true,
        hasBankDetails: false,
        paymentsEnabled: true,
      }),
    ).toEqual([true, false, false, true, false, true]);
  });

  it("marks a storefront ready only when every requirement is complete", () => {
    expect(
      getStorefrontSetupCompletion({
        storeEnabled: true,
        hasLogo: true,
        detailsComplete: true,
        hasListableProduct: true,
        hasBankDetails: true,
        paymentsEnabled: true,
      }).every(Boolean),
    ).toBe(true);
  });

  it("gives every incomplete storefront step a working action", () => {
    render(
      <StorefrontSetupGuide
        storeEnabled
        hasLogo={false}
        detailsComplete={false}
        hasListableProduct={false}
        hasBankDetails={false}
        paymentsEnabled={false}
        storeLink={null}
        enablingStore={false}
        enablingPayments={false}
        onEnableStore={() => undefined}
        onEnablePayments={() => undefined}
      />,
    );

    expect(screen.getByRole("link", { name: /upload business logo/i })).toHaveAttribute("href", "#logo");
    expect(screen.getByRole("link", { name: /complete store details/i })).toHaveAttribute(
      "href",
      "#storefront-details",
    );
    expect(screen.getByRole("link", { name: /add a product or service/i })).toHaveAttribute(
      "href",
      "/dashboard/inventory?create=1",
    );
    expect(screen.getAllByRole("link", { name: /add bank details/i })).toHaveLength(2);
  });
});