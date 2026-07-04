import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UpgradeModal } from "./UpgradeModal";

describe("UpgradeModal", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <UpgradeModal open={false} onClose={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders when open", () => {
    render(<UpgradeModal open={true} onClose={() => {}} />);
    expect(screen.getByText("Upgrade your plan")).toBeInTheDocument();
  });

  it("shows all plan tiers", () => {
    render(<UpgradeModal open={true} onClose={() => {}} />);
    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.getByText("Clinic")).toBeInTheDocument();
  });

  it("shows current plan badge for starter", () => {
    render(
      <UpgradeModal open={true} onClose={() => {}} currentPlan="starter" />
    );
    const badges = screen.getAllByText("Current plan");
    expect(badges.length).toBe(1);
  });

  it("closes on Escape key", () => {
    const onClose = vi.fn();
    render(<UpgradeModal open={true} onClose={onClose} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows upgrade links for Pro and Clinic", () => {
    render(<UpgradeModal open={true} onClose={() => {}} />);
    const links = screen.getAllByText(/Upgrade to/);
    expect(links.length).toBeGreaterThanOrEqual(2);
  });

  it("shows correct current plan name in footer", () => {
    render(
      <UpgradeModal open={true} onClose={() => {}} currentPlan="pro" />
    );
    expect(screen.getByText("Continue with Pro")).toBeInTheDocument();
  });
});
