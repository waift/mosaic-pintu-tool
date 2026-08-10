import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  info: ErrorInfo | null;
}

/**
 * 顶层错误边界:捕获渲染期异常,避免整页白屏。
 *
 * 说明:
 * - 本工具的图片全部保存在浏览器内存(未上传),整页刷新会丢失已导入的图片。
 *   因此降级 UI 优先提供「重试」(仅重置边界,不刷新页面),刷新作为兜底手段。
 * - 只能捕获渲染/生命周期中的同步异常;Promise rejection 与事件回调里的异常不经过这里。
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ info });
    console.error("[MOSAIC] 未捕获的渲染异常:", error, info.componentStack);
  }

  private handleRetry = () => this.setState({ error: null, info: null });

  private handleReload = () => window.location.reload();

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-base-800 p-6">
        <div className="w-full max-w-lg rounded-lg border border-base-500 bg-base-700 p-6 shadow-lift">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warn-500/15 text-warn-500">
              <AlertTriangle size={20} strokeWidth={2} />
            </div>
            <div>
              <h1 className="font-display text-base font-semibold text-ink-50">
                页面出了点问题
              </h1>
              <p className="font-mono text-[11px] text-ink-200">
                已拦截异常,避免整页白屏
              </p>
            </div>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-ink-100">
            可以先点「重试」——它只会重新渲染界面,
            <span className="text-accent-400">已导入的图片不会丢失</span>。
            若反复出错,再选择重新加载页面。
          </p>

          <div className="mt-3 rounded border border-base-500 bg-base-800 px-3 py-2">
            <div className="font-mono text-[10px] uppercase tracking-wide text-ink-200">
              错误信息
            </div>
            <div className="mt-1 break-words font-mono text-[11px] text-warn-400">
              {error.message || String(error)}
            </div>
          </div>

          {import.meta.env.DEV && info?.componentStack && (
            <details className="mt-2">
              <summary className="cursor-pointer font-mono text-[10px] text-ink-200 hover:text-ink-100">
                组件调用栈 (仅开发环境显示)
              </summary>
              <pre className="mt-1 max-h-48 overflow-auto rounded bg-base-900 p-2 font-mono text-[10px] leading-relaxed text-ink-200">
                {info.componentStack}
              </pre>
            </details>
          )}

          <div className="mt-5 flex items-center gap-2">
            <button
              onClick={this.handleRetry}
              className="flex items-center gap-1.5 rounded bg-accent-500 px-3 py-2 font-mono text-[12px] text-base-900 transition-colors hover:bg-accent-600"
            >
              <RotateCcw size={13} />
              重试
            </button>
            <button
              onClick={this.handleReload}
              className="flex items-center gap-1.5 rounded border border-base-500 px-3 py-2 font-mono text-[12px] text-ink-100 transition-colors hover:bg-base-600"
            >
              <RefreshCw size={13} />
              重新加载页面
            </button>
          </div>
        </div>
      </div>
    );
  }
}
