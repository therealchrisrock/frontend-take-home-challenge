"use client";

import { useSkin } from "~/lib/skins/skin-context";
import { cn } from "~/lib/utils";

interface BoardIconProps {
    size?: number;
    className?: string;
    skinId?: string; // Optional: use specific skin instead of current
    lightSquareColor?: string;
    darkSquareColor?: string;
    redPieceColor?: string;
    blackPieceColor?: string;
    showBoard?: boolean;
    showPieces?: boolean;
}

export function BoardIcon({ size = 50, className, skinId, lightSquareColor, darkSquareColor, redPieceColor, blackPieceColor, showBoard = true, showPieces = true }: BoardIconProps) {
    const { currentSkin, availableSkins } = useSkin();

    // Use provided skinId or fall back to current skin
    const skin = skinId
        ? availableSkins.find(s => s.id === skinId) || currentSkin
        : currentSkin;

    const resolveColor = (type: 'lightSquare' | 'darkSquare' | 'redPiece' | 'blackPiece') => {
        switch (type) {
            case 'lightSquare': return lightSquareColor || skin.board.lightSquare.from;
            case 'darkSquare': return darkSquareColor || skin.board.darkSquare.from;
            case 'redPiece': return redPieceColor || skin.pieces.red.gradient.from;
            case 'blackPiece': return blackPieceColor || skin.pieces.black.gradient.from;
        }
    }

    const renderMiniCheckerboard = () => {
        if (!showBoard && !showPieces) return null;

        const squares = [];

        // Create a compact 2x2 grid preview (same as SkinSelector)
        for (let row = 0; row < 2; row++) {
            for (let col = 0; col < 2; col++) {
                const isDark = (row + col) % 2 === 1;
                const background = showBoard
                    ? (isDark
                        ? `linear-gradient(to bottom right, ${resolveColor('darkSquare')}, ${resolveColor('darkSquare')})`
                        : `linear-gradient(to bottom right, ${resolveColor('lightSquare')}, ${resolveColor('lightSquare')})`)
                    : 'transparent';

                // Only place pieces on dark squares to match a real checkerboard
                const hasPiece = showPieces && isDark;
                const pieceGradientFrom = isDark ? resolveColor('blackPiece') : resolveColor('redPiece');
                const pieceGradientTo = isDark ? skin.pieces.black.gradient.to : skin.pieces.red.gradient.to;
                const pieceBorderColor = isDark ? skin.pieces.black.border : skin.pieces.red.border;

                squares.push(
                    <div
                        key={`${row}-${col}`}
                        className="relative aspect-square"
                        style={{ background }}
                    >
                        {hasPiece && (
                            <div
                                className="absolute inset-[22%] rounded-full border"
                                style={{
                                    background: `linear-gradient(to bottom right, ${pieceGradientFrom}, ${pieceGradientTo})`,
                                    borderColor: pieceBorderColor,
                                }}
                            />
                        )}
                    </div>,
                );
            }
        }

        return squares;
    };

    return (
        <div
            className={cn("grid grid-cols-2 gap-0 overflow-hidden rounded-md", className)}
            style={{ width: size, height: size }}
        >
            {renderMiniCheckerboard()}
        </div>
    );
}