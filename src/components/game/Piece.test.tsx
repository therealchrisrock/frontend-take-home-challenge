import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { Piece } from "./Piece";

describe("Piece Component", () => {
  const mockOnDragStart = vi.fn();
  const mockOnDragEnd = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render regular red piece", () => {
    const { container } = render(
      <Piece
        piece={{ color: "red", type: "regular" }}
        isDraggable={true}
        onDragStart={mockOnDragStart}
        onDragEnd={mockOnDragEnd}
      />,
    );

    const piece = container.firstChild as HTMLElement;
    expect(piece).toBeDefined();
    expect(piece.className).toContain("from-red-500");
    expect(piece.className).toContain("to-red-700");
  });

  it("should render regular black piece", () => {
    const { container } = render(
      <Piece
        piece={{ color: "black", type: "regular" }}
        isDraggable={true}
        onDragStart={mockOnDragStart}
        onDragEnd={mockOnDragEnd}
      />,
    );

    const piece = container.firstChild as HTMLElement;
    expect(piece).toBeDefined();
    expect(piece.className).toContain("from-gray-700");
    expect(piece.className).toContain("to-gray-900");
  });

  it("should render king piece with crown", () => {
    const { container } = render(
      <Piece
        piece={{ color: "red", type: "king" }}
        isDraggable={true}
        onDragStart={mockOnDragStart}
        onDragEnd={mockOnDragEnd}
      />,
    );

    // Check for crown icon
    const crown = container.querySelector("svg");
    expect(crown).toBeDefined();
  });

  it("should be draggable when isDraggable is true", () => {
    const { container } = render(
      <Piece
        piece={{ color: "red", type: "regular" }}
        isDraggable={true}
        onDragStart={mockOnDragStart}
        onDragEnd={mockOnDragEnd}
      />,
    );

    const piece = container.firstChild as HTMLElement;
    expect(piece.getAttribute("draggable")).toBe("true");
    expect(piece.className).toContain("cursor-grab");
  });

  it("should not be draggable when isDraggable is false", () => {
    const { container } = render(
      <Piece
        piece={{ color: "red", type: "regular" }}
        isDraggable={false}
        onDragStart={mockOnDragStart}
        onDragEnd={mockOnDragEnd}
      />,
    );

    const piece = container.firstChild as HTMLElement;
    expect(piece.getAttribute("draggable")).toBe("false");
    expect(piece.className).toContain("cursor-not-allowed");
  });

  it("should call onDragStart when drag starts", () => {
    const { container } = render(
      <Piece
        piece={{ color: "red", type: "regular" }}
        isDraggable={true}
        onDragStart={mockOnDragStart}
        onDragEnd={mockOnDragEnd}
      />,
    );

    const piece = container.firstChild as HTMLElement;
    fireEvent.dragStart(piece);

    expect(mockOnDragStart).toHaveBeenCalled();
  });

  it("should call onDragEnd when drag ends", () => {
    const { container } = render(
      <Piece
        piece={{ color: "red", type: "regular" }}
        isDraggable={true}
        onDragStart={mockOnDragStart}
        onDragEnd={mockOnDragEnd}
      />,
    );

    const piece = container.firstChild as HTMLElement;
    fireEvent.dragEnd(piece);

    expect(mockOnDragEnd).toHaveBeenCalled();
  });

  it("should have hover effect when draggable", () => {
    const { container } = render(
      <Piece
        piece={{ color: "red", type: "regular" }}
        isDraggable={true}
        onDragStart={mockOnDragStart}
        onDragEnd={mockOnDragEnd}
      />,
    );

    const piece = container.firstChild as HTMLElement;
    expect(piece.className).toContain("hover:scale-110");
  });

  it("should have correct styling for king pieces", () => {
    const { container } = render(
      <Piece
        piece={{ color: "black", type: "king" }}
        isDraggable={true}
        onDragStart={mockOnDragStart}
        onDragEnd={mockOnDragEnd}
      />,
    );

    const piece = container.firstChild as HTMLElement;
    // Kings have a ring/border
    expect(piece.className).toContain("ring-2");
  });

  it("should apply correct size classes", () => {
    const { container } = render(
      <Piece
        piece={{ color: "red", type: "regular" }}
        isDraggable={true}
        onDragStart={mockOnDragStart}
        onDragEnd={mockOnDragEnd}
      />,
    );

    const piece = container.firstChild as HTMLElement;
    expect(piece.className).toContain("w-12");
    expect(piece.className).toContain("h-12");
  });
});
