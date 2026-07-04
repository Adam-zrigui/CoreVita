import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RegisterForm } from "./RegisterForm";

vi.mock("@/lib/firebase/auth", () => ({
  signUpWithEmail: vi.fn(),
  sendVerificationEmail: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(() => ({})),
  signOut: vi.fn(),
}));

import { signUpWithEmail } from "@/lib/firebase/auth";

beforeEach(() => {
  vi.clearAllMocks();
  delete (window as any).location;
  window.location = { href: "", search: "" } as any;
});

describe("RegisterForm", () => {
  it("renders name, email, and password fields", () => {
    render(<RegisterForm />);
    expect(screen.getByPlaceholderText("Full name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email address")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password (min. 6 characters)")).toBeInTheDocument();
    expect(screen.getByTestId("register-submit")).toBeInTheDocument();
  });

  it("shows validation error when name is empty", async () => {
    render(<RegisterForm />);
    fireEvent.click(screen.getByTestId("register-submit"));
    expect(await screen.findByText("Please enter your full name.")).toBeInTheDocument();
  });

  it("shows validation error when password is too short", async () => {
    render(<RegisterForm />);
    fireEvent.change(screen.getByPlaceholderText("Full name"), { target: { value: "John" } });
    fireEvent.click(screen.getByTestId("register-submit"));
    expect(await screen.findByText("Password must be at least 6 characters.")).toBeInTheDocument();
  });

  it("calls signUpWithEmail and shows verification card on success", async () => {
    const fakeUser = { getIdToken: vi.fn().mockResolvedValue("tok") };
    vi.mocked(signUpWithEmail).mockResolvedValue(fakeUser as any);
    global.fetch = vi.fn().mockResolvedValue({ ok: true } as Response);

    render(<RegisterForm />);
    fireEvent.change(screen.getByPlaceholderText("Full name"), { target: { value: "John Doe" } });
    fireEvent.change(screen.getByPlaceholderText("Email address"), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password (min. 6 characters)"), { target: { value: "secret123" } });
    fireEvent.click(screen.getByTestId("register-submit"));

    await waitFor(() => {
      expect(signUpWithEmail).toHaveBeenCalledWith("a@b.com", "secret123", "John Doe");
      expect(screen.getByTestId("verify-email-card")).toBeInTheDocument();
    });
  });

  it("shows error when register API fails", async () => {
    const fakeUser = { getIdToken: vi.fn().mockResolvedValue("tok") };
    vi.mocked(signUpWithEmail).mockResolvedValue(fakeUser as any);
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: "Email taken" }) } as any);

    render(<RegisterForm />);
    fireEvent.change(screen.getByPlaceholderText("Full name"), { target: { value: "John Doe" } });
    fireEvent.change(screen.getByPlaceholderText("Email address"), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password (min. 6 characters)"), { target: { value: "secret123" } });
    fireEvent.click(screen.getByTestId("register-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("register-error")).toHaveTextContent("Email taken");
    });
  });
});
