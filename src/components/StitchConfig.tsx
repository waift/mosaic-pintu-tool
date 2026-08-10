import { useStitchStore } from "@/store/stitchStore";
import { ConfigGroup, Segmented } from "@/components/ui/ConfigControls";
import { Card } from "@/components/ui/Card";
import {
  DIRECTION_LABELS,
  FORMAT_LABELS,
  type Direction,
  type OutputFormat,
} from "@/types";
import { cn } from "@/lib/utils";

export default function StitchConfig() {
  const config = useStitchStore((s) => s.config);
  const updateConfig = useStitchStore((s) => s.updateConfig);

  const showQuality = config.format !== "png";

  return (
    <Card variant="panel" className="space-y-4">
      <div className="font-display text-xs font-medium uppercase tracking-wider text-ink-200">
        拼接配置
      </div>

      {/* 方向 */}
      <ConfigGroup label="拼接方向" inline>
        <Segmented<Direction>
          value={config.direction}
          onChange={(v) => updateConfig({ direction: v })}
          options={[
            { value: "vertical", label: DIRECTION_LABELS.vertical },
            { value: "horizontal", label: DIRECTION_LABELS.horizontal },
          ]}
        />
      </ConfigGroup>

      {/* 间距 */}
      <ConfigGroup label="图片间距" hint="px">
        <input
          type="number"
          min={0}
          max={500}
          value={config.gap}
          onChange={(e) =>
            updateConfig({ gap: Math.max(0, Number(e.target.value) || 0) })
          }
          className={cn(
            "w-full rounded border border-base-500 bg-base-900/60 px-3 py-1.5",
            "font-mono text-xs text-ink-50 outline-none",
            "focus:border-accent-500 focus:shadow-accent-glow",
          )}
        />
      </ConfigGroup>

      {/* 背景色 */}
      <ConfigGroup label="背景色">
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={config.bgColor.slice(0, 7)}
            onChange={(e) =>
              updateConfig({
                bgColor: e.target.value,
                transparent: false,
              })
            }
            disabled={config.transparent}
            className="h-8 w-10 rounded"
          />
          <input
            type="text"
            value={config.bgColor}
            onChange={(e) => updateConfig({ bgColor: e.target.value })}
            disabled={config.transparent}
            className={cn(
              "flex-1 rounded border border-base-500 bg-base-900/60 px-3 py-1.5",
              "font-mono text-[11px] text-ink-50 outline-none",
              "focus:border-accent-500 focus:shadow-accent-glow",
              config.transparent && "opacity-40",
            )}
          />
          <label
            className={cn(
              "flex cursor-pointer items-center gap-1.5 rounded border border-base-500 px-2 py-1.5",
              "font-mono text-[10px] text-ink-100 transition-colors",
              config.transparent && "border-accent-500 bg-accent-500/10 text-accent-400",
              config.format === "jpeg" && "cursor-not-allowed opacity-40",
            )}
            title={
              config.format === "jpeg"
                ? "JPG 不支持透明"
                : "PNG/WebP 支持透明"
            }
          >
            <input
              type="checkbox"
              checked={config.transparent}
              disabled={config.format === "jpeg"}
              onChange={(e) =>
                updateConfig({ transparent: e.target.checked })
              }
              className="hidden"
            />
            透明
          </label>
        </div>
        {config.format === "jpeg" && config.transparent && (
          <p className="font-mono text-[10px] text-warn-400">
            JPG 不支持透明,将自动转为白底
          </p>
        )}
      </ConfigGroup>

      {/* 输出格式 */}
      <ConfigGroup label="输出格式" inline>
        <Segmented<OutputFormat>
          value={config.format}
          onChange={(v) => updateConfig({ format: v })}
          options={[
            { value: "png", label: FORMAT_LABELS.png },
            { value: "jpeg", label: FORMAT_LABELS.jpeg },
            { value: "webp", label: FORMAT_LABELS.webp },
          ]}
        />
      </ConfigGroup>

      {/* 质量(仅 JPG/WebP) */}
      {showQuality && (
        <ConfigGroup label="质量" hint={`${config.quality}%`}>
          <input
            type="range"
            min={10}
            max={100}
            value={config.quality}
            onChange={(e) =>
              updateConfig({ quality: Number(e.target.value) })
            }
            className={cn(
              "w-full appearance-none rounded-full bg-base-900/60",
              "[&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3",
              "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full",
              "[&::-webkit-slider-thumb]:bg-accent-500 [&::-webkit-slider-thumb]:shadow-accent-glow",
              "[&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3",
              "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-accent-500",
            )}
          />
        </ConfigGroup>
      )}
    </Card>
  );
}
