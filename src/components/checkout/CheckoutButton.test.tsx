import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CheckoutButton } from "./CheckoutButton";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

let toastError: any;
beforeEach(async () => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
  delete (window as any).location;
  window.location = { href: "" } as any;
  toastError = (await import("sonner")).toast;
  vi.spyOn(toastError, "error").mockImplementation(() => "");
  vi.spyOn(toastError, "success").mockImplementation(() => "");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CheckoutButton", () => {
  it("renders children text", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "none" }),
    });
    render(<CheckoutButton plan="pro">Start free trial</CheckoutButton>);
    await waitFor(() => expect(screen.getByText("Start free trial")).toBeInTheDocument());
  });

  it("shows Switch to Pro when user has active subscription", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "active" }),
    });
    render(<CheckoutButton plan="pro" planName="Pro">Start free trial</CheckoutButton>);
    await waitFor(() => expect(screen.getByText("Switch to Pro")).toBeInTheDocument());
  });

  it("shows Switch to Clinic when user has active trialing subscription", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "trialing" }),
    });
    render(<CheckoutButton plan="enterprise" planName="Clinic">Contact sales</CheckoutButton>);
    await waitFor(() => expect(screen.getByText("Switch to Clinic")).toBeInTheDocument());
  });

  it("shows original children when fetch fails", async () => {
    (global.fetch as any).mockRejectedValue(new Error("Network error"));
    render(<CheckoutButton plan="pro" planName="Pro">Start free trial</CheckoutButton>);
    await waitFor(() => expect(screen.getByText("Start free trial")).toBeInTheDocument());
  });

  it("shows original children when no active subscription", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "none" }),
    });
    render(<CheckoutButton plan="pro" planName="Pro">Start free trial</CheckoutButton>);
    await waitFor(() => expect(screen.getByText("Start free trial")).toBeInTheDocument());
  });

  it("shows original children when usage endpoint returns canceled status", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "canceled" }),
    });
    render(<CheckoutButton plan="pro" planName="Pro">Start free trial</CheckoutButton>);
    await waitFor(() => expect(screen.getByText("Start free trial")).toBeInTheDocument());
  });

  it("renders mailto link when plan is null", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "none" }),
    });
    render(<CheckoutButton plan={null}>Contact sales</CheckoutButton>);
    await waitFor(() => expect(screen.getByText("Contact sales")).toBeInTheDocument());
    const link = screen.getByText("Contact sales");
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "mailto:sales@corevita.com?subject=Enterprise%20plan%20inquiry");
  });

  it("does not show Switch label when planName is omitted", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "active" }),
    });
    render(<CheckoutButton plan="pro">Start free trial</CheckoutButton>);
    await waitFor(() => expect(screen.getByText("Start free trial")).toBeInTheDocument());
  });

  it("shows Redirecting while loading", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "none" }),
    });
    render(<CheckoutButton plan="pro">Start free trial</CheckoutButton>);

    (global.fetch as any).mockImplementationOnce(() => new Promise(() => {}));
    fireEvent.click(screen.getByText("Start free trial"));
    expect(screen.getByText("Redirecting...")).toBeInTheDocument();
  });

  it("calls checkout API and redirects on click", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "none" }),
    });
    render(<CheckoutButton plan="pro">Start free trial</CheckoutButton>);
    await waitFor(() => expect(screen.getByText("Start free trial")).toBeInTheDocument());

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ url: "https://checkout.stripe.com/test" }),
    });

    fireEvent.click(screen.getByText("Start free trial"));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/stripe/checkout", expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ plan: "pro" }),
      }));
    });
    expect(window.location.href).toBe("https://checkout.stripe.com/test");
  });

  it("redirects to login on 401", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "none" }),
    });
    render(<CheckoutButton plan="pro">Start free trial</CheckoutButton>);
    await waitFor(() => expect(screen.getByText("Start free trial")).toBeInTheDocument());

    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: "Unauthorized" }),
    });

    fireEvent.click(screen.getByText("Start free trial"));
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });

  it("shows toast on checkout error", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "none" }),
    });
    render(<CheckoutButton plan="pro">Start free trial</CheckoutButton>);
    await waitFor(() => expect(screen.getByText("Start free trial")).toBeInTheDocument());

    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Server error" }),
    });

    fireEvent.click(screen.getByText("Start free trial"));
    await waitFor(() => {
      expect(toastError.error).toHaveBeenCalledWith("Server error");
    });
  });

  it("disables button while loading", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "none" }),
    });
    render(<CheckoutButton plan="pro">Start free trial</CheckoutButton>);
    await waitFor(() => expect(screen.getByText("Start free trial")).toBeInTheDocument());

    (global.fetch as any).mockImplementationOnce(() => new Promise(() => {}));
    const btn = screen.getByRole("button");
    fireEvent.click(btn);
    expect(btn).toBeDisabled();
  });

  it("shows success toast when plan is switched in-app", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "active" }),
    });
    render(<CheckoutButton plan="pro" planName="Pro">Start free trial</CheckoutButton>);
    await waitFor(() => expect(screen.getByText("Switch to Pro")).toBeInTheDocument());

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ switched: true }),
    });

    fireEvent.click(screen.getByText("Switch to Pro"));
    await waitFor(() => {
      expect(toastError.success).toHaveBeenCalledWith("Switched to Pro!");
    });
    expect(window.location.href).toBe("");
  });

  it("switches in-app even without planName", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "active" }),
    });
    render(<CheckoutButton plan="pro">Start free trial</CheckoutButton>);
    await waitFor(() => expect(screen.getByText("Start free trial")).toBeInTheDocument());

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ switched: true }),
    });

    fireEvent.click(screen.getByText("Start free trial"));
    await waitFor(() => {
      expect(toastError.success).toHaveBeenCalledWith("Switched to new plan!");
    });
  });
});
