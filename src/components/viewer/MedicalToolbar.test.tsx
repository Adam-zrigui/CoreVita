import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MedicalToolbar } from "./MedicalToolbar";

describe("MedicalToolbar", () => {
  it("renders all tool buttons", () => {
    render(<MedicalToolbar onAction={() => {}} />);
    expect(screen.getByTestId("tool-fullscreen")).toBeInTheDocument();
    expect(screen.getByTestId("tool-zoomIn")).toBeInTheDocument();
    expect(screen.getByTestId("tool-zoomOut")).toBeInTheDocument();
    expect(screen.getByTestId("tool-invert")).toBeInTheDocument();
    expect(screen.getByTestId("tool-reset")).toBeInTheDocument();
    expect(screen.getByTestId("tool-download")).toBeInTheDocument();
    expect(screen.getByTestId("tool-export")).toBeInTheDocument();
    expect(screen.getByTestId("tool-report")).toBeInTheDocument();
  });

  it("calls onAction with tool id on click", () => {
    const onAction = vi.fn();
    render(<MedicalToolbar onAction={onAction} />);
    fireEvent.click(screen.getByTestId("tool-invert"));
    expect(onAction).toHaveBeenCalledWith("invert");
  });

  it("blocks gated tools for starter plan", () => {
    const onAction = vi.fn();
    render(<MedicalToolbar onAction={onAction} plan="starter" />);
    fireEvent.click(screen.getByTestId("tool-export"));
    expect(onAction).not.toHaveBeenCalled();
  });

  it("calls onAction for each tool when not gated", () => {
    const onAction = vi.fn();
    render(<MedicalToolbar onAction={onAction} plan="pro" />);
    const tools = ["fullscreen", "zoomIn", "zoomOut", "invert", "reset", "download", "export", "report"];
    tools.forEach((id) => fireEvent.click(screen.getByTestId(`tool-${id}`)));
    expect(onAction).toHaveBeenCalledTimes(8);
  });
});
