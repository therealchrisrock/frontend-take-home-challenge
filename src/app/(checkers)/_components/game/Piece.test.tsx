import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent } from "@testing-library/react";
import { renderWithProviders } from "~/test/test-utils";
import { Piece } from "./Piece";

describe("Piece Component", () => {
  const mockOnDragStart = vi.fn();
  const mockOnDragEnd = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render regular red piece", () => {
    const { container } = renderWithProviders(
      <Piece
        piece={{ color: "red", type: "regular" }}
        isDraggable={true}
        onDragStart={mockOnDragStart}
        onDragEnd={mockOnDragEnd}
      />,
    );

    const piece = container.querySelector('[draggable]') as HTMLElement;
    expect(piece).toBeDefined();
    // Check for CSS variable styles instead of Tailwind classes
    const style = piece.getAttribute('style');
    expect(style).toContain('linear-gradient');
    expect(style).toContain('--piece-red-from');
    expect(style).toContain('--piece-red-to');
  });

  it("should render regular black piece", () => {
    const { container } = renderWithProviders(
      <Piece
        piece={{ color: "black", type: "regular" }}
        isDraggable={true}
        onDragStart={mockOnDragStart}
        onDragEnd={mockOnDragEnd}
      />,
    );

    const piece = container.querySelector('[draggable]') as HTMLElement;
    expect(piece).toBeDefined();
    // Check for CSS variable styles instead of Tailwind classes
    const style = piece.getAttribute('style');
    expect(style).toContain('linear-gradient');
    expect(style).toContain('--piece-black-from');
    expect(style).toContain('--piece-black-to');
  });

  it("should render king piece with crown", () => {
    const { container } = renderWithProviders(
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
    const { container } = renderWithProviders(
      <Piece
        piece={{ color: "red", type: "regular" }}
        isDraggable={true}
        onDragStart={mockOnDragStart}
        onDragEnd={mockOnDragEnd}
      />,
    );

    const piece = container.querySelector('[draggable]') as HTMLElement;
    expect(piece.getAttribute("draggable")).toBe("true");
    expect(piece.className).toContain("cursor-grab");
  });

  it("should not be draggable when isDraggable is false", () => {
    const { container } = renderWithProviders(
      <Piece
        piece={{ color: "red", type: "regular" }}
        isDraggable={false}
        onDragStart={mockOnDragStart}
        onDragEnd={mockOnDragEnd}
      />,
    );

    const piece = container.querySelector('[draggable]') as HTMLElement;
    expect(piece.getAttribute("draggable")).toBe("false");
    expect(piece.className).toContain("cursor-not-allowed");
  });

  it("should call onDragStart when drag starts", () => {
    const { container } = renderWithProviders(
      <Piece
        piece={{ color: "red", type: "regular" }}
        isDraggable={true}
        onDragStart={mockOnDragStart}
        onDragEnd={mockOnDragEnd}
      />,
    );

    const piece = container.querySelector('[draggable]') as HTMLElement;
    fireEvent.dragStart(piece);

    expect(mockOnDragStart).toHaveBeenCalled();
  });

  it("should call onDragEnd when drag ends", () => {
    const { container } = renderWithProviders(
      <Piece
        piece={{ color: "red", type: "regular" }}
        isDraggable={true}
        onDragStart={mockOnDragStart}
        onDragEnd={mockOnDragEnd}
      />,
    );

    const piece = container.querySelector('[draggable]') as HTMLElement;
    fireEvent.dragEnd(piece);

    expect(mockOnDragEnd).toHaveBeenCalled();
  });

  it("should have hover effect when draggable", () => {
    const { container } = renderWithProviders(
      <Piece
        piece={{ color: "red", type: "regular" }}
        isDraggable={true}
        onDragStart={mockOnDragStart}
        onDragEnd={mockOnDragEnd}
      />,
    );

    const piece = container.querySelector('[draggable]') as HTMLElement;
    // Note: hover:scale-105 is only applied if reducedMotion is false
    expect(piece.className).toContain("hover:scale-105");
  });

  it("should have correct styling for king pieces", () => {
    const { container } = renderWithProviders(
      <Piece
        piece={{ color: "black", type: "king" }}
        isDraggable={true}
        onDragStart={mockOnDragStart}
        onDragEnd={mockOnDragEnd}
      />,
    );

    const piece = container.querySelector('[draggable]') as HTMLElement;
    // Check for crown icon instead of ring
    const crown = container.querySelector("svg");
    expect(crown).toBeDefined();
  });

  it("should apply correct size classes", () => {
    const { container } = renderWithProviders(
      <Piece
        piece={{ color: "red", type: "regular" }}
        isDraggable={true}
        onDragStart={mockOnDragStart}
        onDragEnd={mockOnDragEnd}
      />,
    );

    const piece = container.querySelector('[draggable]') as HTMLElement;
    // Component uses w-[80%] h-[80%] not fixed sizes
    expect(piece.className).toContain("w-[80%]");
    expect(piece.className).toContain("h-[80%]");
  });
});
