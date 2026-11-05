"use client";

import { useEffect, useRef, useState, type FC } from "react";
import { Stage, Layer, Image as KonvaImage, Circle, Rect, Text } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { Annotation, Capture, Geometry, ZoomMode } from "../lib/types";

interface CanvasProps {
    capture: Capture;
    annotations: Annotation[];
    geometry: Geometry | null;
    mode: "point" | "rect";
    zoom: ZoomMode;
    onSelect: (geometry: Geometry) => void;
}

const ScreenshotCanvas: FC<CanvasProps> = ({
    capture,
    annotations,
    geometry,
    mode,
    zoom,
    onSelect,
}) => {
    const container = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(600);
    const [height, setHeight] = useState(600);
    const [image, setImage] = useState<HTMLImageElement | null>(null);
    const [error, setError] = useState("");
    const [start, setStart] = useState<{ x: number; y: number } | null>(null);
    const [draft, setDraft] = useState<Geometry | null>(null);
    useEffect(() => {
        const observer = new ResizeObserver(([entry]) => {
            setWidth(entry.contentRect.width);
            setHeight(entry.contentRect.height);
        });
        if (container.current) observer.observe(container.current);
        return () => observer.disconnect();
    }, [error]);
    useEffect(() => {
        const img = new window.Image();
        setImage(null);
        setError("");
        img.onload = () => setImage(img);
        img.onerror = () =>
            setError("Screenshot could not load. Open the original or recapture this screen.");
        img.src = `/api/image/${capture.id}`;
        return () => {
            img.onload = null;
            img.onerror = null;
        };
    }, [capture.id]);
    const fitWidth = Math.max(1, width) / capture.width;
    const scale =
        zoom === "actual"
            ? 1
            : zoom === "width"
              ? fitWidth
              : Math.min(fitWidth, Math.max(1, height) / capture.height);
    const pointer = (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
        const point = event.target.getStage()?.getPointerPosition();
        return point
            ? {
                  x: Math.max(0, Math.min(capture.width - 1, Math.round(point.x / scale))),
                  y: Math.max(0, Math.min(capture.height - 1, Math.round(point.y / scale))),
              }
            : null;
    };
    const rectangle = (from: { x: number; y: number }, to: { x: number; y: number }): Geometry => ({
        type: "rect",
        x: Math.min(from.x, to.x),
        y: Math.min(from.y, to.y),
        width: Math.abs(to.x - from.x),
        height: Math.abs(to.y - from.y),
    });
    const down = (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
        const point = pointer(event);
        if (!point) return;
        if (mode === "point") onSelect({ type: "point", ...point });
        else {
            setStart(point);
            setDraft(null);
        }
    };
    const move = (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
        const point = pointer(event);
        if (start && point) setDraft(rectangle(start, point));
    };
    const up = (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
        const point = pointer(event);
        if (start && point) {
            const selected = rectangle(start, point);
            if (selected.type === "rect" && selected.width > 0 && selected.height > 0)
                onSelect(selected);
        }
        setStart(null);
        setDraft(null);
    };
    const shapes = [
        ...annotations.map((annotation, index) => ({
            geometry: annotation.geometry,
            label: String(index + 1),
            color: annotation.status === "accepted" ? "#007b70" : "#b42318",
        })),
        ...((draft ?? geometry)
            ? [{ geometry: (draft ?? geometry)!, label: "+", color: "#007b70" }]
            : []),
    ];
    return (
        <div className="screenshot-canvas">
            {error ? (
                <p className="error" role="alert">
                    {error}
                </p>
            ) : (
                <div
                    ref={container}
                    className="canvas-wrap"
                    style={{ touchAction: mode === "rect" ? "none" : "auto" }}
                    data-testid="annotation-canvas"
                    aria-label="Screenshot annotation canvas. Use the coordinate fields for keyboard annotation.">
                    <Stage
                        width={capture.width * scale}
                        height={capture.height * scale}
                        scaleX={scale}
                        scaleY={scale}
                        onMouseDown={down}
                        onMouseMove={move}
                        onMouseUp={up}
                        onMouseLeave={up}
                        onTouchStart={mode === "rect" ? down : undefined}
                        onTouchMove={move}
                        onTouchEnd={mode === "rect" ? up : undefined}
                        onTap={mode === "point" ? down : undefined}
                        preventDefault={mode === "rect"}>
                        <Layer>
                            <KonvaImage
                                image={image ?? undefined}
                                width={capture.width}
                                height={capture.height}
                                preventDefault={mode === "rect"}
                            />
                            {shapes.map((shape, index) => (
                                <Rect
                                    key={`outline-${index}`}
                                    {...(shape.geometry.type === "rect"
                                        ? shape.geometry
                                        : {
                                              x: shape.geometry.x - 12 / scale,
                                              y: shape.geometry.y - 12 / scale,
                                              width: 24 / scale,
                                              height: 24 / scale,
                                          })}
                                    stroke={shape.color}
                                    strokeWidth={2 / scale}
                                    listening={false}
                                />
                            ))}
                            {shapes.map((shape, index) => (
                                <Circle
                                    key={`point-${index}`}
                                    x={shape.geometry.x}
                                    y={shape.geometry.y}
                                    radius={11 / scale}
                                    fill={shape.color}
                                    listening={false}
                                />
                            ))}
                            {shapes.map((shape, index) => (
                                <Text
                                    key={`label-${index}`}
                                    x={shape.geometry.x - 6 / scale}
                                    y={shape.geometry.y - 7 / scale}
                                    text={shape.label}
                                    fontSize={13 / scale}
                                    fill="white"
                                    listening={false}
                                />
                            ))}
                        </Layer>
                    </Stage>
                </div>
            )}
        </div>
    );
};
export default ScreenshotCanvas;
