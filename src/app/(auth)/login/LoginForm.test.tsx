import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LoginForm } from "./LoginForm";

vi.mock("@/lib/firebase/auth", () => ({
  signInWithEmail: vi.fn(),
}));

import { signInWithEmail } from "@/lib/firebase/auth";

beforeEach(() => {
  vi.clearAllMocks();
  delete (window as any).location;
  window.location = { href: "", search: "" } as any;
});

describe("LoginForm", () => {
  it("renders email and password fields", () => {
    render(<LoginForm />);
    expect(screen.getByPlaceholderText("Email address")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    expect(screen.getByTestId("login-submit")).toBeInTheDocument();
  });

  it("shows validation error on empty submit", async () => {
    render(<LoginForm />);
    fireEvent.click(screen.getByTestId("login-submit"));
    expect(await screen.findByText("Please enter your email and password.")).toBeInTheDocument();
  });

  it("shows validation error when email is empty", async () => {
    render(<LoginForm />);
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "secret" } });
    fireEvent.click(screen.getByTestId("login-submit"));
    expect(await screen.findByText("Please enter your email and password.")).toBeInTheDocument();
  });

  it("calls signInWithEmail and redirects on success", async () => {
    const fakeUser = { getIdToken: vi.fn().mockResolvedValue("tok"), emailVerified: true };
    vi.mocked(signInWithEmail).mockResolvedValue(fakeUser as any);
    global.fetch = vi.fn().mockResolvedValue({ ok: true } as Response);

    render(<LoginForm />);
    fireEvent.change(screen.getByPlaceholderText("Email address"), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "secret" } });
    fireEvent.click(screen.getByTestId("login-submit"));

    await waitFor(() => {
      expect(signInWithEmail).toHaveBeenCalledWith("a@b.com", "secret");
      expect(window.location.href).toBe("/dashboard");
    });
  });

  it("does not set error when signInWithEmail returns null (silent no-op)", async () => {
    vi.mocked(signInWithEmail).mockResolvedValue(null);
    render(<LoginForm />);
    fireEvent.change(screen.getByPlaceholderText("Email address"), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "secret" } });
    fireEvent.click(screen.getByTestId("login-submit"));

    await waitFor(() => {
      expect(signInWithEmail).toHaveBeenCalled();
    });
    expect(screen.queryByTestId("login-error")).not.toBeInTheDocument();
    expect(screen.queryByText("Sign-in failed")).not.toBeInTheDocument();
  });

  it("shows error when session API fails", async () => {
    const fakeUser = { getIdToken: vi.fn().mockResolvedValue("tok"), emailVerified: true };
    vi.mocked(signInWithEmail).mockResolvedValue(fakeUser as any);
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: "session setup failed" }) } as any);

    render(<LoginForm />);
    fireEvent.change(screen.getByPlaceholderText("Email address"), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "secret" } });
    fireEvent.click(screen.getByTestId("login-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("login-error")).toHaveTextContent("session setup failed");
    });
  });

  it("disables inputs while loading", async () => {
    vi.mocked(signInWithEmail).mockImplementation(() => new Promise(() => {}));
    // mock emailVerified to avoid the unverified-card path
    global.fetch = vi.fn().mockResolvedValue({ ok: true } as Response);
    render(<LoginForm />);
    fireEvent.change(screen.getByPlaceholderText("Email address"), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "x" } });
    fireEvent.click(screen.getByTestId("login-submit"));

    expect(await screen.findByText("Signing in...")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email address")).toBeDisabled();
    expect(screen.getByPlaceholderText("Password")).toBeDisabled();
  });

  it("shows forgot password link", () => {
    render(<LoginForm />);
    expect(screen.getByText("Forgot password?")).toBeInTheDocument();
  });
});
