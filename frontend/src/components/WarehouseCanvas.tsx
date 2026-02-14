import { useRef, useEffect } from "react";
import { Robot, Position } from "../types";

interface Props {
  grid: number[][];
  robots: Robot[];
  congestionZones: Position[];
}

const CELL = 38;
const PAD = 1;

const COLORS = {
  floor: "#1a1d23",
  rack: "#3b3f4a",
  packing: "#2d6a4f",
  charging: "#e6a817",
  gridLine: "#2a2d35",
  robot: {
    idle: "#60a5fa",
    moving: "#34d399",
    picking: "#f59e0b",
    delivering: "#a78bfa",
    charging: "#e6a817",
  },
  path: "rgba(96, 165, 250, 0.2)",
  congestion: "rgba(239, 68, 68, 0.25)",
  text: "#e5e7eb",
};

export function WarehouseCanvas({ grid, robots, congestionZones }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || grid.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = grid[0].length;
    const height = grid.length;
    canvas.width = width * CELL;
    canvas.height = height * CELL;

    // Clear
    ctx.fillStyle = "#111318";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid cells
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cell = grid[y][x];
        let color = COLORS.floor;
        if (cell === 1) color = COLORS.rack;
        else if (cell === 2) color = COLORS.packing;
        else if (cell === 3) color = COLORS.charging;

        ctx.fillStyle = color;
        ctx.fillRect(x * CELL + PAD, y * CELL + PAD, CELL - PAD * 2, CELL - PAD * 2);

        // Rack label
        if (cell === 1) {
          ctx.fillStyle = "#555";
          ctx.font = "9px monospace";
          ctx.textAlign = "center";
          ctx.fillText("rack", x * CELL + CELL / 2, y * CELL + CELL / 2 + 3);
        }

        // Station labels
        if (cell === 2) {
          ctx.fillStyle = "#a7f3d0";
          ctx.font = "bold 8px monospace";
          ctx.textAlign = "center";
          ctx.fillText("PACK", x * CELL + CELL / 2, y * CELL + CELL / 2 + 3);
        }
        if (cell === 3) {
          ctx.fillStyle = "#fbbf24";
          ctx.font = "bold 7px monospace";
          ctx.textAlign = "center";
          ctx.fillText("CHG", x * CELL + CELL / 2, y * CELL + CELL / 2 + 3);
        }
      }
    }

    // Draw congestion zones
    for (const zone of congestionZones) {
      ctx.fillStyle = COLORS.congestion;
      ctx.fillRect((zone.x - 1) * CELL, (zone.y - 1) * CELL, CELL * 3, CELL * 3);
      ctx.strokeStyle = "rgba(239, 68, 68, 0.6)";
      ctx.lineWidth = 2;
      ctx.strokeRect((zone.x - 1) * CELL, (zone.y - 1) * CELL, CELL * 3, CELL * 3);
    }

    // Draw robot paths
    for (const robot of robots) {
      if (robot.path.length > 0) {
        ctx.strokeStyle = COLORS.path;
        ctx.lineWidth = 3;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(robot.x * CELL + CELL / 2, robot.y * CELL + CELL / 2);
        for (const p of robot.path) {
          ctx.lineTo(p.x * CELL + CELL / 2, p.y * CELL + CELL / 2);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Draw robots
    for (const robot of robots) {
      const cx = robot.x * CELL + CELL / 2;
      const cy = robot.y * CELL + CELL / 2;
      const r = CELL / 2 - 4;

      // Glow effect
      const statusColor = COLORS.robot[robot.status] || COLORS.robot.idle;
      ctx.shadowColor = statusColor;
      ctx.shadowBlur = 12;

      // Robot body
      ctx.fillStyle = statusColor;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;

      // Robot ID
      ctx.fillStyle = "#111";
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(robot.id, cx, cy);

      // Battery bar
      const barW = CELL - 8;
      const barH = 3;
      const barX = robot.x * CELL + 4;
      const barY = robot.y * CELL + CELL - 6;

      ctx.fillStyle = "#333";
      ctx.fillRect(barX, barY, barW, barH);

      const batColor = robot.battery > 50 ? "#22c55e" : robot.battery > 20 ? "#eab308" : "#ef4444";
      ctx.fillStyle = batColor;
      ctx.fillRect(barX, barY, barW * (robot.battery / 100), barH);
    }
  }, [grid, robots, congestionZones]);

  return (
    <div style={{ overflow: "auto", borderRadius: 8, border: "1px solid #2a2d35" }}>
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </div>
  );
}
