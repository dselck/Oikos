import { createAgentOSClient, IAgentOSClient } from "./agentos-client";
import { IngestionResponse } from "./types";

export interface ChunkingOptions {
  strategy?: "recursive" | "semantic" | "fixed_size";
  chunkSize?: number;
  chunkOverlap?: number;
  recreateVectorDb?: boolean;
}

export interface IndexDocumentInput {
  kbId: string;
  title: string;
  content: string;
  format?: "markdown" | "text" | "pdf";
  instanceId?: string;
  options?: ChunkingOptions;
}

export interface IndexUrlInput {
  kbId: string;
  title: string;
  url: string;
  instanceId?: string;
  options?: ChunkingOptions;
}

/**
 * Deep RAG Document Indexing Engine Module
 *
 * Encapsulates document format auto-detection, reader strategy resolution
 * (MarkdownReader, WebsiteReader, PDFReader, TextReader), optimal chunking default derivation,
 * parameter validation, and ingestion telemetry.
 */
export class RagIndexingEngine {
  constructor(private client?: IAgentOSClient) {}

  private getClient(instanceId?: string): IAgentOSClient {
    return this.client || createAgentOSClient(instanceId || "default");
  }

  /**
   * Indexes text, markdown, or PDF document content into an Agno AgentOS Knowledge Base.
   */
  public async indexDocument(input: IndexDocumentInput): Promise<IngestionResponse> {
    const { kbId, title, content, format, instanceId, options = {} } = input;

    if (!kbId || !kbId.trim()) {
      throw new Error("Missing target knowledge base ID (kbId) for document indexing");
    }

    if (!title || !title.trim()) {
      throw new Error("Missing document title for document indexing");
    }

    if (!content || !content.trim()) {
      throw new Error("Missing document text content for document indexing");
    }

    // Resolve Reader Strategy
    let readerType: "markdown_reader" | "pdf_reader" | "text_reader" = "text_reader";
    if (format === "markdown" || (!format && /^#+/m.test(content))) {
      readerType = "markdown_reader";
    } else if (format === "pdf" || title.toLowerCase().endsWith(".pdf")) {
      readerType = "pdf_reader";
    } else if (format === "text") {
      readerType = "text_reader";
    }

    const client = this.getClient(instanceId);
    return client.knowledgeBases.indexContent({
      kbId,
      sourceType: format === "markdown" ? "markdown" : "text",
      title: title.trim(),
      content: content.trim(),
      readerType,
      chunkingStrategy: options.strategy || "recursive",
      chunkSize: options.chunkSize || 500,
      chunkOverlap: options.chunkOverlap || 50,
      recreateVectorDb: options.recreateVectorDb || false,
    });
  }

  /**
   * Indexes a web page URL into an Agno AgentOS Knowledge Base using WebsiteReader.
   */
  public async indexUrl(input: IndexUrlInput): Promise<IngestionResponse> {
    const { kbId, title, url, instanceId, options = {} } = input;

    if (!kbId || !kbId.trim()) {
      throw new Error("Missing target knowledge base ID (kbId) for URL indexing");
    }

    if (!title || !title.trim()) {
      throw new Error("Missing title for URL indexing");
    }

    if (!url || !url.trim()) {
      throw new Error("Missing target URL for indexing");
    }

    const client = this.getClient(instanceId);
    return client.knowledgeBases.indexContent({
      kbId,
      sourceType: "url",
      title: title.trim(),
      url: url.trim(),
      readerType: "website_reader",
      chunkingStrategy: options.strategy || "recursive",
      chunkSize: options.chunkSize || 500,
      chunkOverlap: options.chunkOverlap || 50,
      recreateVectorDb: options.recreateVectorDb || false,
    });
  }
}

export const ragIndexingEngine = new RagIndexingEngine();

export function createRagIndexingEngine(client?: IAgentOSClient): RagIndexingEngine {
  return new RagIndexingEngine(client);
}
