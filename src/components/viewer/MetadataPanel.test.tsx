import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MetadataPanel } from "./MetadataPanel";

const mockSeries = [
  {
    id: "1",
    seriesUid: "1.2.3.4",
    modality: "MR",
    instanceCount: 200,
    equipment: {
      manufacturer: "Siemens",
      manufacturerModelName: "Skyra",
      stationName: "MR01",
      institutionName: "City Hospital",
      institutionalDepartmentName: "Radiology",
      deviceSerialNumber: null,
      softwareVersions: "syngo MR E11",
    },
  },
  {
    id: "2",
    seriesUid: "1.2.3.5",
    modality: "CT",
    instanceCount: 400,
    equipment: {
      manufacturer: "GE",
      manufacturerModelName: null,
      stationName: "CT02",
      institutionName: null,
      institutionalDepartmentName: null,
      deviceSerialNumber: null,
      softwareVersions: null,
    },
  },
];

describe("MetadataPanel", () => {
  it("shows patient name", () => {
    render(
      <MetadataPanel
        patientName="John Doe"
        studyDate="2024-01-15"
        series={mockSeries}
        plan="starter"
      />
    );
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("shows unknown for missing patient", () => {
    render(<MetadataPanel series={mockSeries} plan="starter" />);
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });

  it("shows study date", () => {
    render(
      <MetadataPanel
        studyDate="2024-01-15"
        series={mockSeries}
        plan="starter"
      />
    );
    expect(screen.getByText("2024-01-15")).toBeInTheDocument();
  });

  it("shows series count", () => {
    render(<MetadataPanel series={mockSeries} plan="starter" />);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows equipment for active series", () => {
    render(
      <MetadataPanel
        series={mockSeries}
        plan="starter"
        activeSeriesIndex={0}
      />
    );
    expect(screen.getByText("Siemens")).toBeInTheDocument();
    expect(screen.getByText("Skyra")).toBeInTheDocument();
    expect(screen.getByText("MR01")).toBeInTheDocument();
  });

  it("shows equipment for second active series", () => {
    render(
      <MetadataPanel
        series={mockSeries}
        plan="starter"
        activeSeriesIndex={1}
      />
    );
    expect(screen.getByText("GE")).toBeInTheDocument();
    expect(screen.getByText("CT02")).toBeInTheDocument();
  });

  it("shows AI Insights for pro plan", () => {
    render(<MetadataPanel series={mockSeries} plan="pro" />);
    expect(screen.getByText("AI confidence: 98%")).toBeInTheDocument();
  });

  it("shows upgrade link for starter plan", () => {
    render(<MetadataPanel series={mockSeries} plan="starter" />);
    expect(screen.getByText("AI Insights")).toBeInTheDocument();
    expect(screen.getByText(/Upgrade to Pro/)).toBeInTheDocument();
  });

  it("shows description when provided", () => {
    render(
      <MetadataPanel
        description="Chest PA and Lateral"
        series={mockSeries}
        plan="starter"
      />
    );
    expect(screen.getByText("Chest PA and Lateral")).toBeInTheDocument();
  });

  it("shows series list with modality and image count", () => {
    render(<MetadataPanel series={mockSeries} plan="starter" />);
    expect(screen.getByText("MR")).toBeInTheDocument();
    expect(screen.getByText("200 images")).toBeInTheDocument();
    expect(screen.getByText("CT")).toBeInTheDocument();
    expect(screen.getByText("400 images")).toBeInTheDocument();
  });

  it("shows upgrade prompt for quick report on starter plan", () => {
    render(<MetadataPanel series={mockSeries} plan="starter" />);
    expect(
      screen.getByText(/upgrade to pro/i)
    ).toBeInTheDocument();
  });
});
