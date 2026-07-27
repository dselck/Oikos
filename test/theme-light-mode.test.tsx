import { render, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { useOikosStore } from "@/lib/store";
import { MainLayout } from "@/components/layout/MainLayout";
import { ControlPlaneView } from "@/components/control-plane/ControlPlaneView";
import { PlaygroundView } from "@/components/playground/PlaygroundView";
import { TraceStreamPane } from "@/components/layout/TraceStreamPane";
import { StatusBar } from "@/components/layout/StatusBar";
import { TraceInspector } from "@/components/playground/TraceInspector";
import { WorkflowStudio } from "@/components/studio/WorkflowStudio";
import { KnowledgeStudio } from "@/components/studio/KnowledgeStudio";
import { SessionsMemoryStudio } from "@/components/studio/SessionsMemoryStudio";
import { AgentTeamStudio } from "@/components/studio/AgentTeamStudio";
import { Navbar } from "@/components/layout/Navbar";
import { ToolExecutionTree } from "@/components/playground/ToolExecutionTree";

describe("Theme Light Mode Conformance", () => {
  beforeEach(() => {
    useOikosStore.setState({
      theme: "light",
      viewMode: "control-plane",
      instances: [
        {
          id: "inst-1",
          name: "Local AgentOS",
          baseUrl: "http://localhost:8000",
          isDefault: true,
          status: "connected",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      activeInstance: {
        id: "inst-1",
        name: "Local AgentOS",
        baseUrl: "http://localhost:8000",
        isDefault: true,
        status: "connected",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      agents: [],
      selectedAgent: null,
      messages: [
        {
          id: "msg-1",
          role: "assistant",
          content: "Hello",
          timestamp: new Date().toISOString(),
        },
      ],
      isTraceOpen: true,
      selectedTraceMessage: {
        id: "msg-1",
        role: "assistant",
        content: "Hello",
        timestamp: new Date().toISOString(),
      },
    });
  });

  it("renders MainLayout with light mode root container when theme is light", async () => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<MainLayout />);
    });
    const rootDiv = result!.container.firstChild as HTMLElement;
    expect(rootDiv).not.toHaveClass("dark");
    expect(rootDiv.className).toContain("bg-slate-50");
  });

  it("renders ControlPlaneView with light mode theme support", async () => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<ControlPlaneView />);
    });
    const rootDiv = result!.container.firstChild as HTMLElement;
    expect(rootDiv.className).not.toContain("bg-slate-950 text-slate-100");
    expect(rootDiv.className).toContain("dark:bg-slate-950");
  });

  it("renders PlaygroundView with light mode theme support", async () => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<PlaygroundView />);
    });
    const rootDiv = result!.container.firstChild as HTMLElement;
    expect(rootDiv.className).not.toContain("bg-slate-950 text-slate-100");
    expect(rootDiv.className).toContain("dark:bg-slate-950");
  });

  it("renders TraceStreamPane with light mode theme support", async () => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<TraceStreamPane currentTheme="light" />);
    });
    const sidePane = result!.container.firstChild as HTMLElement;
    expect(sidePane.className).toContain("bg-white");
    expect(sidePane.className).not.toContain("bg-slate-900 text-slate-100");
  });

  it("renders StatusBar with light mode theme support", async () => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<StatusBar currentTheme="light" />);
    });
    const statusBar = result!.container.firstChild as HTMLElement;
    expect(statusBar.className).toContain("bg-white");
    expect(statusBar.className).not.toContain("bg-slate-950");
  });

  it("renders TraceInspector with light mode theme support", async () => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<TraceInspector />);
    });
    const panel = result!.container.firstChild as HTMLElement;
    expect(panel.className).toContain("bg-white/95");
    expect(panel.className).toContain("dark:bg-slate-950/95");
  });

  it("renders WorkflowStudio with light mode theme support", async () => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<WorkflowStudio />);
    });
    const rootDiv = result!.container.firstChild as HTMLElement;
    expect(rootDiv.className).not.toContain("bg-slate-950");
  });

  it("renders KnowledgeStudio with light mode theme support", async () => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<KnowledgeStudio />);
    });
    const rootDiv = result!.container.firstChild as HTMLElement;
    expect(rootDiv.className).not.toContain("bg-slate-950");
  });

  it("renders SessionsMemoryStudio with light mode theme support", async () => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<SessionsMemoryStudio />);
    });
    const rootDiv = result!.container.firstChild as HTMLElement;
    expect(rootDiv.className).not.toContain("bg-slate-950");
  });

  it("renders AgentTeamStudio with light mode theme support", async () => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<AgentTeamStudio />);
    });
    const rootDiv = result!.container.firstChild as HTMLElement;
    expect(rootDiv.className).not.toContain("bg-slate-950");
  });

  it("renders Navbar with light mode theme support", async () => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<Navbar />);
    });
    const header = result!.container.firstChild as HTMLElement;
    expect(header.className).toContain("bg-white/80");
    expect(header.className).toContain("dark:bg-slate-950/80");
  });


  it("renders ToolExecutionTree with light mode theme support", () => {
    const mockExecutions = [
      {
        id: "tool-1",
        toolName: "duckduckgo_search",
        arguments: { query: "test" },
        status: "success" as const,
        startTime: Date.now(),
      },
    ];
    const { container } = render(<ToolExecutionTree executions={mockExecutions} />);
    const treeDiv = container.firstChild as HTMLElement;
    expect(treeDiv.className).toContain("bg-slate-100/80");
    expect(treeDiv.className).toContain("dark:bg-slate-950/60");
  });
});
