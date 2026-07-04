import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StudiesGrid } from "./StudiesGrid";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

const mockStudies = [
  {
    id: "1",
    studyUid: "1.2.3.4.5",
    patientName: "John Doe",
    patientId: "PID001",
    modality: "MR",
    studyDate: "2024-01-15",
    slices: 200,
    status: "READING",
    description: "Brain MRI",
    createdAt: new Date("2024-01-15"),
    _count: { series: 2, reports: 1, shareTokens: 1 },
  },
  {
    id: "2",
    studyUid: "1.2.3.4.6",
    patientName: "Jane Smith",
    patientId: "PID002",
    modality: "CT",
    studyDate: "2024-02-20",
    slices: 400,
    status: "REPORTED",
    description: "Chest CT",
    createdAt: new Date("2024-02-20"),
    _count: { series: 3, reports: 2, shareTokens: 0 },
  },
  {
    id: "3",
    studyUid: "1.2.3.4.7",
    patientName: "Alice Brown",
    patientId: null,
    modality: null,
    studyDate: null,
    slices: 50,
    status: "PENDING",
    description: null,
    createdAt: new Date("2024-03-10"),
    _count: { series: 1, reports: 0, shareTokens: 0 },
  },
];

describe("StudiesGrid", () => {
  it("renders all studies", () => {
    render(<StudiesGrid studies={mockStudies} />);
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByText("Alice Brown")).toBeInTheDocument();
  });

  it("shows empty state when no studies", () => {
    render(<StudiesGrid studies={[]} />);
    expect(screen.getByText("No studies yet")).toBeInTheDocument();
  });

  it("filters by patient name", () => {
    render(<StudiesGrid studies={mockStudies} />);
    const search = screen.getByPlaceholderText(
      /Search by patient name/
    );
    fireEvent.change(search, { target: { value: "john" } });
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.queryByText("Jane Smith")).not.toBeInTheDocument();
  });

  it("filters by description", () => {
    render(<StudiesGrid studies={mockStudies} />);
    const search = screen.getByPlaceholderText(
      /Search by patient name/
    );
    fireEvent.change(search, { target: { value: "Chest" } });
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.queryByText("Alice Brown")).not.toBeInTheDocument();
  });

  it("filters by study UID", () => {
    render(<StudiesGrid studies={mockStudies} />);
    const search = screen.getByPlaceholderText(
      /Search by patient name/
    );
    fireEvent.change(search, { target: { value: "1.2.3.4.5" } });
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.queryByText("Jane Smith")).not.toBeInTheDocument();
  });

  it("shows modality filter dropdown when multiple modalities exist", () => {
    render(<StudiesGrid studies={mockStudies} />);
    expect(screen.getByText("All modalities")).toBeInTheDocument();
    expect(screen.getByText("MR")).toBeInTheDocument();
    expect(screen.getByText("CT")).toBeInTheDocument();
  });

  it("hides modality filter when only one modality", () => {
    render(
      <StudiesGrid
        studies={mockStudies.filter((s) => s.modality === "MR")}
      />
    );
    expect(screen.queryByText("All modalities")).not.toBeInTheDocument();
  });

  it("shows modality color badge on each card", () => {
    render(<StudiesGrid studies={mockStudies} />);
    const initials = screen.getAllByText("M");
    expect(initials.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("C")).toBeInTheDocument();
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("shows status badges", () => {
    render(<StudiesGrid studies={mockStudies} />);
    expect(screen.getByText("READING")).toBeInTheDocument();
    expect(screen.getByText("REPORTED")).toBeInTheDocument();
    expect(screen.getByText("PENDING")).toBeInTheDocument();
  });

  it("shows series and slices count", () => {
    render(<StudiesGrid studies={mockStudies} />);
    expect(screen.getByText("2 series")).toBeInTheDocument();
    expect(screen.getByText("200 slices")).toBeInTheDocument();
    expect(screen.getByText("3 series")).toBeInTheDocument();
    expect(screen.getByText("400 slices")).toBeInTheDocument();
  });

  it("shows report count", () => {
    render(<StudiesGrid studies={mockStudies} />);
    expect(screen.getByText("1 report")).toBeInTheDocument();
    expect(screen.getByText("2 reports")).toBeInTheDocument();
    expect(screen.getByText("0 reports")).toBeInTheDocument();
  });

  it("shows unknown for missing patient name", () => {
    const studies = [
      { ...mockStudies[0], patientName: null, patientId: null },
    ];
    render(<StudiesGrid studies={studies} />);
    expect(screen.getByText("Unknown Patient")).toBeInTheDocument();
  });

  it("shows description on cards when present", () => {
    render(<StudiesGrid studies={mockStudies} />);
    expect(screen.getByText("Brain MRI")).toBeInTheDocument();
    expect(screen.getByText("Chest CT")).toBeInTheDocument();
  });

  it("shows no-studies-match message when filter has no results", () => {
    render(<StudiesGrid studies={mockStudies} />);
    const search = screen.getByPlaceholderText(
      /Search by patient name/
    );
    fireEvent.change(search, { target: { value: "zzzzz" } });
    expect(
      screen.getByText("No studies match your search")
    ).toBeInTheDocument();
  });

  it("each study card links to its detail page", () => {
    render(<StudiesGrid studies={mockStudies} />);
    const link = screen.getByText("John Doe").closest("a");
    expect(link).toHaveAttribute("href", "/studies/1");
  });
});
