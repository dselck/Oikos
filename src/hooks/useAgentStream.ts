"use client";

import { useState, useCallback } from "react";
import { ToolCallExecution } from "@/lib/types";
import { streamAgentRun } from "@/lib/agentos";

interface StreamAgentOptions {
  instanceId: string;
  agentId: string;
  message: string;
  sessionId?: string;
  onChunk: (chunk: string, timeToFirstTokenMs: number, totalDurationMs: number) => void;
  onToolCall?: (toolCall: ToolCallExecution) => void;
  onRawEvent?: (event: Record<string, unknown>) => void;
}

export function useAgentStream() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [tokensPerSecond, setTokensPerSecond] = useState<number | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);

  const executeStream = useCallback(async (options: StreamAgentOptions) => {
    const { instanceId, agentId, message, sessionId, onChunk, onToolCall, onRawEvent } = options;

    setIsStreaming(true);
    setStreamError(null);
    setTokensPerSecond(null);

    const startTime = Date.now();
    let firstTokenTime: number | null = null;
    let chunkCount = 0;

    try {
      const toolExecMap = new Map<string, ToolCallExecution>();

      await streamAgentRun({
        instanceId,
        agentId,
        message,
        sessionId,
        onChunk: (chunkText) => {
          if (!firstTokenTime) {
            firstTokenTime = Date.now();
          }
          chunkCount += 1;

          const elapsedSec = (Date.now() - startTime) / 1000;
          if (elapsedSec > 0) {
            setTokensPerSecond(Number((chunkCount / elapsedSec).toFixed(1)));
          }

          const ttft = firstTokenTime ? firstTokenTime - startTime : 0;
          const duration = Date.now() - startTime;
          onChunk(chunkText, ttft, duration);
        },
        onToolCall: (toolCall) => {
          toolExecMap.set(toolCall.id, toolCall);
          if (onToolCall) onToolCall(toolCall);
        },
        onRawEvent: (evt) => {
          if (onRawEvent) onRawEvent(evt);
        },
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setStreamError(errMsg);
      throw err;
    } finally {
      setIsStreaming(false);
    }
  }, []);

  return {
    isStreaming,
    tokensPerSecond,
    streamError,
    executeStream,
  };
}
