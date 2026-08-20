import { useRef } from "react";
import type { PointerEvent } from "react";

interface FloatingIconProps {
  pressed: boolean;
  bottom: number;
  right: number;
  onToggle: () => void;
  onPositionChange: (bottom: number, right: number) => void;
}

export function FloatingIcon({
  pressed,
  bottom,
  right,
  onToggle,
  onPositionChange
}: FloatingIconProps) {
  const drag = useRef<{
    startX: number;
    startY: number;
    bottom: number;
    right: number;
    moved: boolean;
  } | null>(null);
  const suppressClick = useRef(false);

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    drag.current = {
      startX: event.clientX,
      startY: event.clientY,
      bottom,
      right,
      moved: false
    };
  };

  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const current = drag.current;
    if (!current) {
      return;
    }
    const deltaX = event.clientX - current.startX;
    const deltaY = event.clientY - current.startY;
    if (Math.abs(deltaX) + Math.abs(deltaY) > 6) {
      current.moved = true;
      const nextRight = Math.min(
        Math.max(8, current.right - deltaX),
        window.innerWidth - 56
      );
      const nextBottom = Math.min(
        Math.max(8, current.bottom - deltaY),
        window.innerHeight - 56
      );
      onPositionChange(nextBottom, nextRight);
    }
  };

  const onPointerUp = () => {
    const moved = drag.current?.moved === true;
    drag.current = null;
    if (moved) {
      suppressClick.current = true;
    }
  };

  const onClick = () => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    onToggle();
  };

  return (
    <button
      type="button"
      className="icon-button"
      aria-label="Salesforce Metadata Copilot"
      aria-pressed={pressed}
      aria-haspopup="dialog"
      style={{ bottom: `${bottom}px`, right: `${right}px` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={onClick}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 3c-2.2 0-4.1 1.4-4.8 3.4C5 6.7 3.5 8.4 3.5 10.5 3.5 13 5.5 15 8 15h8.2c2.3 0 4.3-1.9 4.3-4.3 0-2.1-1.5-3.8-3.5-4.2C16.3 4.5 14.3 3 12 3zm-1 8h2v5h-2zm0 6h2v2h-2z" />
      </svg>
    </button>
  );
}
