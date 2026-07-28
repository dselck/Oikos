import { describe, it, expect, vi } from "vitest";
import { RagIndexingEngine } from "../src/lib/rag-engine";
import { IAgentOSClient } from "../src/lib/agentos-client";

describe("RagIndexingEngine Deep Module Seam", () => {
  it("auto-resolves markdown_reader for markdown document content", async () => {
    const mockIndexContent = vi.fn().mockResolvedValue({
      success: true,
      documentsIndexed: 1,
      chunksGenerated: 3,
      message: "Indexed successfully",
    });

    const mockClient = {
      knowledgeBases: {
        indexContent: mockIndexContent,
      },
    } as unknown as IAgentOSClient;

    const ragEngine = new RagIndexingEngine(mockClient);

    const result = await ragEngine.indexDocument({
      kbId: "kb-123",
      title: "Agent Architecture Spec",
      content: "# AgentOS Architecture\n\nDeep module details here...",
    });

    expect(result.success).toBe(true);
    expect(mockIndexContent).toHaveBeenCalledWith({
      kbId: "kb-123",
      sourceType: "text",
      title: "Agent Architecture Spec",
      content: "# AgentOS Architecture\n\nDeep module details here...",
      readerType: "markdown_reader",
      chunkingStrategy: "recursive",
      chunkSize: 500,
      chunkOverlap: 50,
      recreateVectorDb: false,
    });
  });

  it("auto-resolves website_reader for URL indexing", async () => {
    const mockIndexContent = vi.fn().mockResolvedValue({
      success: true,
      documentsIndexed: 1,
      chunksGenerated: 5,
      message: "Indexed URL successfully",
    });

    const mockClient = {
      knowledgeBases: {
        indexContent: mockIndexContent,
      },
    } as unknown as IAgentOSClient;

    const ragEngine = new RagIndexingEngine(mockClient);

    const result = await ragEngine.indexUrl({
      kbId: "kb-123",
      title: "Agno Documentation",
      url: "https://docs.agno.com/overview",
      options: { chunkSize: 1000, chunkOverlap: 100 },
    });

    expect(result.success).toBe(true);
    expect(mockIndexContent).toHaveBeenCalledWith({
      kbId: "kb-123",
      sourceType: "url",
      title: "Agno Documentation",
      url: "https://docs.agno.com/overview",
      readerType: "website_reader",
      chunkingStrategy: "recursive",
      chunkSize: 1000,
      chunkOverlap: 100,
      recreateVectorDb: false,
    });
  });

  it("validates missing parameters and throws meaningful error", async () => {
    const ragEngine = new RagIndexingEngine();

    await expect(
      ragEngine.indexDocument({
        kbId: "",
        title: "Test",
        content: "Content",
      })
    ).rejects.toThrow("Missing target knowledge base ID");
  });
});
