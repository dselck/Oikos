"use client";

import { useOikosStore } from "@/lib/store";
import { sessionStreamEngine, AttachedFile, SessionStreamEngine } from "@/lib/session-engine";

export interface SendSessionMessageOptions {
  instanceId?: string;
  entityId?: string;
  entityType?: "agent" | "team" | "workflow";
  message: string;
  attachedFiles?: AttachedFile[];
  sessionId?: string;
  userId?: string;
  files?: string[];
  version?: string;
}

export function useSessionStream(engine: SessionStreamEngine = sessionStreamEngine) {
  const store = useOikosStore();

  const sendMessage = async (options: SendSessionMessageOptions) => {
    const instanceId = options.instanceId || store.activeInstance?.id || "default";
    const entityId = options.entityId || store.selectedAgent?.id || "agent";
    const entityType = options.entityType || "agent";

    return engine.streamMessage({
      ...options,
      instanceId,
      entityId,
      entityType,
      sink: {
        onMessageAdd: (msg) => store.addMessage(msg),
        onMessageUpdate: (updater) => store.updateLastMessage(updater),
        onStateChange: (state) => store.setStreamState(state),
      },
    });
  };

  const cancelRun = () => {
    engine.cancelStream();
  };

  return {
    sendMessage,
    cancelRun,
    isStreaming: store.streamState.isStreaming,
    tokensPerSecond: store.streamState.tokensPerSecond,
    streamError: store.streamState.streamError,
    streamState: store.streamState,
  };
}
