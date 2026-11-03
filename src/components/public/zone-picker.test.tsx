import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { publicZoneFixtures } from "@/lib/public-service-fixtures";

import { ZonePicker } from "./zone-picker";

describe("ZonePicker", () => {
  it("is labelled 'Tu zona', shows the selected zone's name and lists every zone", async () => {
    const user = userEvent.setup();
    render(<ZonePicker zones={publicZoneFixtures} value={publicZoneFixtures[1].id} onChange={() => undefined} />);

    const trigger = screen.getByRole("combobox", { name: "Tu zona" });
    expect(trigger).toHaveTextContent("Norte");

    await user.click(trigger);
    const options = await screen.findAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual(publicZoneFixtures.map((zone) => zone.name));
  });

  it("asks to pick a zone when none is selected and reports the chosen zone's id", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ZonePicker zones={publicZoneFixtures} value={undefined} onChange={onChange} />);

    const trigger = screen.getByRole("combobox", { name: "Tu zona" });
    expect(trigger).toHaveTextContent("Elegí tu zona");

    await user.click(trigger);
    await user.click(await screen.findByRole("option", { name: "Sur" }));

    expect(onChange).toHaveBeenCalledWith(publicZoneFixtures[2].id);
  });

  it("can be disabled while zones are not available", () => {
    render(<ZonePicker zones={[]} value={undefined} onChange={() => undefined} disabled />);
    expect(screen.getByRole("combobox", { name: "Tu zona" })).toBeDisabled();
  });
});
