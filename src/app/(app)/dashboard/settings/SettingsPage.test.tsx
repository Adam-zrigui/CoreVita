import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SettingsPage from "./page";

let toastError: any;

beforeEach(async () => {
  vi.clearAllMocks();
  delete (window as any).location;
  window.location = { href: "" } as any;
  toastError = (await import("sonner")).toast;
  vi.spyOn(toastError, "error").mockImplementation(() => "");
  vi.spyOn(toastError, "success").mockImplementation(() => "");
});

afterEach(() => {
  vi.restoreAllMocks();
});

const defaultUsage = { plan: "pro", status: "active", used: 5, limit: 100, remaining: 95 };

function setupFetch(usage = defaultUsage) {
  global.fetch = vi.fn((url: string) => {
    if (url === "/api/billing/usage") {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(usage) });
    }
    if (url === "/api/team") {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ tenant: { id: "t1", name: "My Clinic", slug: "my-clinic" } }) });
    }
    if (url === "/api/billing/portal") {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ url: "https://portal.stripe.com/test" }) });
    }
    // default for child component fetches (api-keys, branding, etc.)
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

describe("SettingsPage", () => {
  it("renders loading skeleton while fetching", () => {
    global.fetch = vi.fn(() => new Promise(() => {}));
    const { container } = render(<SettingsPage />);
    const pulses = container.querySelectorAll(".animate-pulse");
    expect(pulses.length).toBeGreaterThanOrEqual(1);
  });

  it("renders plan cards after data loads", async () => {
    setupFetch();
    render(<SettingsPage />);
    expect(await screen.findByText("Free")).toBeInTheDocument();
    expect(await screen.findByText("Pro")).toBeInTheDocument();
    expect(await screen.findByText("Clinic")).toBeInTheDocument();
  });

  it("shows Current badge and Active plan on the current plan card", async () => {
    setupFetch({ plan: "pro", status: "active", used: 5, limit: 100, remaining: 95 });
    render(<SettingsPage />);
    expect(await screen.findByText("Current")).toBeInTheDocument();
    const activeLabels = screen.getAllByText("Active plan");
    expect(activeLabels.length).toBe(1);
    expect(screen.queryByText("Switch to Pro")).not.toBeInTheDocument();
  });

  it("shows Switch to buttons for non-current plans", async () => {
    setupFetch({ plan: "pro", status: "active", used: 5, limit: 100, remaining: 95 });
    render(<SettingsPage />);
    await waitFor(() => {
      expect(screen.getByText("Switch to Clinic")).toBeInTheDocument();
    });
  });

  it("shows Cancel subscription on Free card when user has active subscription", async () => {
    setupFetch({ plan: "pro", status: "active", used: 5, limit: 100, remaining: 95 });
    render(<SettingsPage />);
    await waitFor(() => {
      expect(screen.getByText("Cancel subscription")).toBeInTheDocument();
    });
  });

  it("shows plan name and status in Plan & Billing section", async () => {
    setupFetch({ plan: "enterprise", status: "active", used: 10, limit: 500, remaining: 490 });
    render(<SettingsPage />);
    await waitFor(() => {
      expect(screen.getByText((t) => t.toLowerCase().includes("enterprise plan"))).toBeInTheDocument();
      expect(screen.getByText("active")).toBeInTheDocument();
    });
  });

  it("redirects to billing portal when clicking Cancel subscription", async () => {
    setupFetch({ plan: "pro", status: "active", used: 5, limit: 100, remaining: 95 });
    render(<SettingsPage />);
    await waitFor(() => {
      expect(screen.getByText("Cancel subscription")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Cancel subscription"));
    await waitFor(() => {
      expect(window.location.href).toBe("https://portal.stripe.com/test");
    });
  });

  it("redirects to stripe checkout when clicking Switch to Clinic", async () => {
    setupFetch({ plan: "pro", status: "active", used: 5, limit: 100, remaining: 95 });
    // Override for this specific call
    global.fetch = vi.fn((url: string) => {
      if (url === "/api/billing/usage") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ plan: "pro", status: "active", used: 5, limit: 100, remaining: 95 }) });
      }
      if (url === "/api/team") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ tenant: { id: "t1", name: "My Clinic", slug: "my-clinic" } }) });
      }
      if (url === "/api/stripe/checkout") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ url: "https://checkout.stripe.com/clinic" }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    render(<SettingsPage />);
    await waitFor(() => {
      expect(screen.getByText("Switch to Clinic")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Switch to Clinic"));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/stripe/checkout", expect.objectContaining({ method: "POST" }));
    });
    expect(window.location.href).toBe("https://checkout.stripe.com/clinic");
  });

  it("shows toast on handleSwitch error", async () => {
    setupFetch({ plan: "pro", status: "active", used: 5, limit: 100, remaining: 95 });
    global.fetch = vi.fn((url: string) => {
      if (url === "/api/billing/usage") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ plan: "pro", status: "active", used: 5, limit: 100, remaining: 95 }) });
      }
      if (url === "/api/team") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ tenant: { id: "t1", name: "My Clinic", slug: "my-clinic" } }) });
      }
      if (url === "/api/stripe/checkout") {
        return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({ error: "Server error" }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    render(<SettingsPage />);
    await waitFor(() => {
      expect(screen.getByText("Switch to Clinic")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Switch to Clinic"));
    await waitFor(() => {
      expect(toastError.error).toHaveBeenCalledWith("Server error");
    });
  });

  it("handles 401 in handleSwitch without showing toast", async () => {
    setupFetch({ plan: "pro", status: "active", used: 5, limit: 100, remaining: 95 });
    global.fetch = vi.fn((url: string) => {
      if (url === "/api/billing/usage") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ plan: "pro", status: "active", used: 5, limit: 100, remaining: 95 }) });
      }
      if (url === "/api/team") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ tenant: { id: "t1", name: "My Clinic", slug: "my-clinic" } }) });
      }
      if (url === "/api/stripe/checkout") {
        return Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({ error: "Unauthorized" }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    render(<SettingsPage />);
    await waitFor(() => {
      expect(screen.getByText("Switch to Clinic")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Switch to Clinic"));
    await waitFor(() => {
      expect(toastError.error).not.toHaveBeenCalled();
    });
  });

  it("shows toast when portal returns no url", async () => {
    setupFetch({ plan: "pro", status: "active", used: 5, limit: 100, remaining: 95 });
    global.fetch = vi.fn((url: string) => {
      if (url === "/api/billing/usage") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ plan: "pro", status: "active", used: 5, limit: 100, remaining: 95 }) });
      }
      if (url === "/api/team") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ tenant: { id: "t1", name: "My Clinic", slug: "my-clinic" } }) });
      }
      if (url === "/api/billing/portal") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ error: "No active subscription" }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    render(<SettingsPage />);
    await waitFor(() => {
      expect(screen.getByText("Cancel subscription")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Cancel subscription"));
    await waitFor(() => {
      expect(toastError.error).toHaveBeenCalledWith("No active subscription");
    });
  });

  it("shows No subscription when usage has empty status", async () => {
    setupFetch({ plan: "starter", used: 0, limit: 3, remaining: 3 } as any);
    render(<SettingsPage />);
    await waitFor(() => {
      expect(screen.getByText((t) => t.toLowerCase().includes("no subscription"))).toBeInTheDocument();
    });
  });

  it("shows Switch to Pro and Switch to Clinic when on Free plan", async () => {
    setupFetch({ plan: "starter", status: "active", used: 0, limit: 3, remaining: 3 });
    render(<SettingsPage />);
    await waitFor(() => {
      expect(screen.getByText("Switch to Pro")).toBeInTheDocument();
      expect(screen.getByText("Switch to Clinic")).toBeInTheDocument();
    });
  });

  it("disables Switch button while switching", async () => {
    setupFetch({ plan: "starter", status: "active", used: 0, limit: 3, remaining: 3 });
    global.fetch = vi.fn((url: string) => {
      if (url === "/api/billing/usage") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ plan: "starter", status: "active", used: 0, limit: 3, remaining: 3 }) });
      }
      if (url === "/api/team") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ tenant: { id: "t1", name: "My Clinic", slug: "my-clinic" } }) });
      }
      // Never resolves – keeps loading state
      if (url === "/api/stripe/checkout") {
        return new Promise(() => {});
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    render(<SettingsPage />);
    await waitFor(() => {
      expect(screen.getByText("Switch to Pro")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Switch to Pro"));
    const btn = screen.getByText("Switching...").closest("button");
    expect(btn).toBeDisabled();
  });

  it("shows usage stats after loading", async () => {
    setupFetch({ plan: "pro", status: "active", used: 42, limit: 100, remaining: 58 });
    render(<SettingsPage />);
    await waitFor(() => {
      expect(screen.getByText("42")).toBeInTheDocument();
      expect(screen.getByText("58 remaining")).toBeInTheDocument();
    });
  });
});
