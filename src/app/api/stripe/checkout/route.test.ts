import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

const mockGetServerSession = vi.hoisted(() => vi.fn().mockResolvedValue({ user: { id: "user-1" } }));
const mockFindUniqueUser = vi.hoisted(() => vi.fn());
const mockFindUniqueSub = vi.hoisted(() => vi.fn());
const mockCheckoutCreate = vi.hoisted(() => vi.fn());
const mockSubRetrieve = vi.hoisted(() => vi.fn());
const mockPortalCreate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  getServerSession: () => mockGetServerSession(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mockFindUniqueUser },
    subscription: { findUnique: mockFindUniqueSub },
  },
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    checkout: { sessions: { create: mockCheckoutCreate } },
    subscriptions: { retrieve: mockSubRetrieve },
    billingPortal: { sessions: { create: mockPortalCreate } },
  },
  PLANS: {
    pro: { priceId: "price_pro", name: "Pro" },
    enterprise: { priceId: "price_clinic", name: "Clinic" },
  },
}));

const mockUser = {
  id: "user-1",
  email: "test@example.com",
  memberships: [{ tenantId: "tenant-1", tenant: { id: "tenant-1" } }],
};

function buildRequest(body: any, origin = "http://localhost:3000") {
  return new Request(`${origin}/api/stripe/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", origin },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/stripe/checkout", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    const res = await POST(buildRequest({ plan: "pro" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid plan", async () => {
    mockFindUniqueUser.mockResolvedValue(mockUser);
    const res = await POST(buildRequest({ plan: "nonexistent" }));
    expect(res.status).toBe(400);
  });

  it("creates checkout session when no existing subscription", async () => {
    mockFindUniqueUser.mockResolvedValue(mockUser);
    mockFindUniqueSub.mockResolvedValue(null);
    mockCheckoutCreate.mockResolvedValue({ url: "https://checkout.stripe.com/test" });

    const res = await POST(buildRequest({ plan: "pro" }));
    const data = await res.json();

    expect(data.url).toBe("https://checkout.stripe.com/test");
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        line_items: [{ price: "price_pro", quantity: 1 }],
        customer_email: "test@example.com",
      })
    );
  });

  it("creates checkout session with existing customer when subscription is active", async () => {
    mockFindUniqueUser.mockResolvedValue(mockUser);
    mockFindUniqueSub.mockResolvedValue({ stripeId: "sub_123" } as any);
    mockSubRetrieve.mockResolvedValue({
      status: "active",
      customer: "cus_123",
      items: { data: [{ id: "si_123" }] },
    });
    mockCheckoutCreate.mockResolvedValue({ url: "https://checkout.stripe.com/upgrade" });

    const res = await POST(buildRequest({ plan: "enterprise" }));
    const data = await res.json();

    expect(data.url).toBe("https://checkout.stripe.com/upgrade");
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        customer: "cus_123",
        line_items: [{ price: "price_clinic", quantity: 1 }],
      })
    );
    expect(mockPortalCreate).not.toHaveBeenCalled();
  });

  it("handles expanded customer object for active subscription", async () => {
    mockFindUniqueUser.mockResolvedValue(mockUser);
    mockFindUniqueSub.mockResolvedValue({ stripeId: "sub_123" } as any);
    mockSubRetrieve.mockResolvedValue({
      status: "active",
      customer: { id: "cus_expanded" },
      items: { data: [{ id: "si_123" }] },
    });
    mockCheckoutCreate.mockResolvedValue({ url: "https://checkout.stripe.com/upgrade" });

    const res = await POST(buildRequest({ plan: "pro" }));
    const data = await res.json();

    expect(data.url).toBe("https://checkout.stripe.com/upgrade");
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_expanded" })
    );
  });

  it("redirects to portal when subscription is past_due", async () => {
    mockFindUniqueUser.mockResolvedValue(mockUser);
    mockFindUniqueSub.mockResolvedValue({ stripeId: "sub_123" } as any);
    mockSubRetrieve.mockResolvedValue({
      status: "past_due",
      customer: "cus_123",
      items: { data: [{ id: "si_123" }] },
    });
    mockPortalCreate.mockResolvedValue({ url: "https://portal.stripe.com/test" });

    const res = await POST(buildRequest({ plan: "pro" }));
    const data = await res.json();

    expect(data.url).toBe("https://portal.stripe.com/test");
    expect(mockPortalCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_123",
        return_url: "http://localhost:3000/dashboard/settings",
      })
    );
    expect(mockCheckoutCreate).not.toHaveBeenCalled();
  });

  it("handles expanded customer object for portal redirect", async () => {
    mockFindUniqueUser.mockResolvedValue(mockUser);
    mockFindUniqueSub.mockResolvedValue({ stripeId: "sub_123" } as any);
    mockSubRetrieve.mockResolvedValue({
      status: "past_due",
      customer: { id: "cus_expanded" },
      items: { data: [{ id: "si_123" }] },
    });
    mockPortalCreate.mockResolvedValue({ url: "https://portal.stripe.com/test" });

    const res = await POST(buildRequest({ plan: "enterprise" }));
    const data = await res.json();

    expect(data.url).toBe("https://portal.stripe.com/test");
    expect(mockPortalCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_expanded" })
    );
  });

  it("creates checkout for Clinic plan without existing subscription", async () => {
    mockFindUniqueUser.mockResolvedValue(mockUser);
    mockFindUniqueSub.mockResolvedValue(null);
    mockCheckoutCreate.mockResolvedValue({ url: "https://checkout.stripe.com/clinic" });

    const res = await POST(buildRequest({ plan: "enterprise" }));
    const data = await res.json();

    expect(data.url).toBe("https://checkout.stripe.com/clinic");
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: "price_clinic", quantity: 1 }],
      })
    );
  });
});
