"use client";

import React, { useState } from "react";
import { useAgentOSRegistry } from "@/hooks/useAgentOSRegistry";
import { IngestionResponse } from "@/lib/types";
import {
  FileText,
  Plus,
  Trash2,
  Database,
  UploadCloud,
  Globe,
  Search,
  CheckCircle2,
  Sparkles,
  HardDrive,
  Loader2,
  Sliders,
} from "lucide-react";

interface KnowledgeBaseRecord {
  id: string;
  name: string;
  description?: string | null;
  vectorDbType?: string;
  tableOrCollection?: string;
  embedderModel?: string;
  documentCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export function KnowledgeStudio() {
  const { knowledgeBases: knowledgeBasesRaw, deleteEntity, mutateEntity, indexDocument, indexUrl } = useAgentOSRegistry();
  const knowledgeBases = knowledgeBasesRaw as unknown as KnowledgeBaseRecord[];

  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Form State for creating KB
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [vectorDbType, setVectorDbType] = useState("sqlite_vec");
  const [tableOrCollection, setTableOrCollection] = useState("documents_vec");
  const [embedderModel, setEmbedderModel] = useState("text-embedding-3-small");

  // Selection State
  const [selectedKbId, setSelectedKbId] = useState<string | null>(null);
  const activeSelectedKbId = selectedKbId || (knowledgeBases.length > 0 ? knowledgeBases[0].id : null);

  // Agno AgentOS Indexing Strategy State
  const [sourceType, setSourceType] = useState<"text" | "markdown" | "url">("markdown");
  const [docTitle, setDocTitle] = useState("");
  const [docContent, setDocContent] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [readerType, setReaderType] = useState<"text_reader" | "pdf_reader" | "website_reader" | "markdown_reader">("markdown_reader");
  const [chunkingStrategy, setChunkingStrategy] = useState<"recursive" | "semantic" | "fixed_size">("recursive");
  const [chunkSize, setChunkSize] = useState<number>(500);
  const [chunkOverlap, setChunkOverlap] = useState<number>(50);
  const [recreateVectorDb, setRecreateVectorDb] = useState<boolean>(false);

  // Ingestion Execution State
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestionResult, setIngestionResult] = useState<IngestionResponse | null>(null);
  const [ingestionError, setIngestionError] = useState<string | null>(null);

  const handleCreateKnowledgeBase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !tableOrCollection.trim()) return;

    const payload = {
      name,
      description,
      vectorDbType,
      tableOrCollection,
      embedderModel,
    };

    await mutateEntity({ resource: "knowledgeBases", action: "create", payload });
    setIsCreating(false);
    setName("");
    setDescription("");
  };

  const handleDeleteKnowledgeBase = async (id: string) => {
    if (!confirm("Are you sure you want to delete this RAG Knowledge Base index?")) return;
    await deleteEntity("knowledgeBases", id);
    if (activeSelectedKbId === id) {
      setSelectedKbId(null);
    }
  };

  const handleIndexContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSelectedKbId || !docTitle.trim()) return;

    if (sourceType === "url" && !docUrl.trim()) return;
    if (sourceType !== "url" && !docContent.trim()) return;

    setIsIngesting(true);
    setIngestionResult(null);
    setIngestionError(null);

    try {
      const options = {
        strategy: chunkingStrategy,
        chunkSize,
        chunkOverlap,
        recreateVectorDb,
      };

      const res =
        sourceType === "url"
          ? await indexUrl({
              kbId: activeSelectedKbId,
              title: docTitle,
              url: docUrl,
              options,
            })
          : await indexDocument({
              kbId: activeSelectedKbId,
              title: docTitle,
              content: docContent,
              format: sourceType === "markdown" ? "markdown" : "text",
              options,
            });

      setIngestionResult(res);
      setDocTitle("");
      setDocContent("");
      setDocUrl("");
    } catch (err) {
      setIngestionError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsIngesting(false);
    }
  };

  const filteredKbs = knowledgeBases.filter(
    (k) =>
      k.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (k.description && k.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
      {/* Studio Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-mono tracking-tight">Knowledge & RAG Documents Hub</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage Vector DB indices (`PgVector`, `sqlite_vec`, `Qdrant`), configure Agno AgentOS reader strategies, and index RAG context.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 transition"
        >
          <Plus className="h-4 w-4" />
          Create Knowledge Base
        </button>
      </div>

      {/* CREATE KNOWLEDGE BASE MODAL */}
      {isCreating && (
        <form
          onSubmit={handleCreateKnowledgeBase}
          className="rounded-2xl border border-emerald-500/40 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-sm font-mono flex items-center gap-2">
              <Database className="h-4 w-4 text-emerald-500" />
              Configure New Agno RAG Knowledge Base
            </h3>
            <span className="text-[11px] font-mono text-emerald-500">Knowledge Base Integration</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold mb-1">Knowledge Base Name</label>
              <input
                type="text"
                placeholder="e.g. AgentOS Documentation Index"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 outline-none font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Description</label>
              <input
                type="text"
                placeholder="Content description for RAG context"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Vector DB Engine</label>
              <select
                value={vectorDbType}
                onChange={(e) => setVectorDbType(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 outline-none font-mono"
              >
                <option value="sqlite_vec">SQLite Vec (Local Embedded)</option>
                <option value="pgvector">PostgreSQL (pgvector)</option>
                <option value="qdrant">Qdrant Vector DB</option>
                <option value="lancedb">LanceDB</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">Collection / Table Name</label>
              <input
                type="text"
                placeholder="e.g. agno_docs_embeddings"
                value={tableOrCollection}
                onChange={(e) => setTableOrCollection(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 outline-none font-mono text-emerald-400"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold mb-1">Embedder Model</label>
              <input
                type="text"
                placeholder="e.g. text-embedding-3-small"
                value={embedderModel}
                onChange={(e) => setEmbedderModel(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 outline-none font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500"
            >
              Initialize Knowledge Base
            </button>
          </div>
        </form>
      )}

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Knowledge Bases List */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search knowledge bases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-9 pr-3 py-1.5 text-xs outline-none focus:border-emerald-500 font-sans"
            />
          </div>

          <div className="space-y-3">
            {filteredKbs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-xs text-slate-500">
                No Knowledge Bases created yet.
              </div>
            ) : (
              filteredKbs.map((kb) => (
                <div
                  key={kb.id}
                  onClick={() => setSelectedKbId(kb.id)}
                  className={`rounded-xl border p-4 cursor-pointer transition ${
                    activeSelectedKbId === kb.id
                      ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-xs flex items-center gap-1.5">
                        <HardDrive className="h-3.5 w-3.5 text-emerald-500" />
                        {kb.name}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{kb.description}</p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteKnowledgeBase(kb.id);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-rose-500 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-slate-400 border-t border-slate-200 dark:border-slate-800/80 pt-2">
                    <span className="text-emerald-500 font-semibold">{kb.vectorDbType}</span>
                    <span>Collection: {kb.tableOrCollection}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Agno AgentOS Strategy Indexing Panel */}
        <div className="lg:col-span-2 space-y-6">
          <form
            onSubmit={handleIndexContent}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-6"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm font-mono flex items-center gap-2">
                <UploadCloud className="h-4 w-4 text-emerald-500" />
                Agno AgentOS Document & Strategy Indexing
              </h3>
              <span className="text-[11px] font-mono text-emerald-500 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Delegated to AgentOS
              </span>
            </div>

            {/* Ingestion Source Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setSourceType("markdown");
                  setReaderType("markdown_reader");
                }}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                  sourceType === "markdown" || sourceType === "text"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <FileText className="h-3.5 w-3.5" /> Text / Markdown
              </button>
              <button
                type="button"
                onClick={() => {
                  setSourceType("url");
                  setReaderType("website_reader");
                }}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                  sourceType === "url"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <Globe className="h-3.5 w-3.5" /> Website / URL Loader
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Document Title / Reference Name</label>
                <input
                  type="text"
                  placeholder="e.g. Agno_AgentOS_Architecture_Guide.md"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 outline-none font-mono"
                />
              </div>

              {sourceType === "url" ? (
                <div>
                  <label className="block font-semibold mb-1">Target Web URL to Ingest</label>
                  <input
                    type="url"
                    placeholder="https://docs.agno.com/concepts/agents"
                    value={docUrl}
                    onChange={(e) => setDocUrl(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 outline-none font-mono text-emerald-400"
                  />
                </div>
              ) : (
                <div>
                  <label className="block font-semibold mb-1">Text / Markdown Content</label>
                  <textarea
                    rows={5}
                    placeholder="Paste Markdown or document text for Agno reader processing..."
                    value={docContent}
                    onChange={(e) => setDocContent(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 font-mono outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              {/* Agno Strategy Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block font-semibold mb-1 flex items-center gap-1.5 text-slate-300">
                    <Sliders className="h-3.5 w-3.5 text-emerald-500" /> Agno Reader Backend
                  </label>
                  <select
                    value={readerType}
                    onChange={(e) =>
                      setReaderType(
                        e.target.value as "text_reader" | "pdf_reader" | "website_reader" | "markdown_reader"
                      )
                    }
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 outline-none font-mono"
                  >
                    <option value="markdown_reader">MarkdownReader (Agno Native)</option>
                    <option value="text_reader">TextReader</option>
                    <option value="website_reader">WebsiteReader (HTML Scraping)</option>
                    <option value="pdf_reader">PDFReader (PyPDF)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 flex items-center gap-1.5 text-slate-300">
                    <Sliders className="h-3.5 w-3.5 text-emerald-500" /> Chunking Strategy
                  </label>
                  <select
                    value={chunkingStrategy}
                    onChange={(e) => setChunkingStrategy(e.target.value as "recursive" | "semantic" | "fixed_size")}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 outline-none font-mono"
                  >
                    <option value="recursive">Recursive Character Chunking</option>
                    <option value="semantic">Semantic Sentence Chunking</option>
                    <option value="fixed_size">Fixed Size Tokens</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-400">Chunk Size (Tokens)</label>
                  <input
                    type="number"
                    value={chunkSize}
                    onChange={(e) => setChunkSize(Number(e.target.value))}
                    min={50}
                    max={4000}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-400">Chunk Overlap (Tokens)</label>
                  <input
                    type="number"
                    value={chunkOverlap}
                    onChange={(e) => setChunkOverlap(Number(e.target.value))}
                    min={0}
                    max={500}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 outline-none font-mono"
                  />
                </div>

                <div className="sm:col-span-2 flex items-center gap-2 pt-1 font-mono text-[11px]">
                  <input
                    type="checkbox"
                    id="recreateIndex"
                    checked={recreateVectorDb}
                    onChange={(e) => setRecreateVectorDb(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0"
                  />
                  <label htmlFor="recreateIndex" className="text-slate-300 cursor-pointer">
                    Recreate Vector DB Collection (Clear existing embeddings before indexing)
                  </label>
                </div>
              </div>

              {/* Dynamic Ingestion Status Feedback */}
              {isIngesting ? (
                <div className="flex items-center justify-center gap-2 p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-400 font-mono text-xs">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Executing Agno AgentOS Ingestion Strategy...
                </div>
              ) : ingestionError ? (
                <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 text-rose-400 font-mono text-xs">
                  Ingestion Error: {ingestionError}
                </div>
              ) : ingestionResult ? (
                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 font-mono text-xs space-y-1">
                  <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    {ingestionResult.message}
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-4 pt-1">
                    <span>Documents Indexed: {ingestionResult.documentsIndexed}</span>
                    <span>Chunks Generated: {ingestionResult.chunksGenerated}</span>
                  </div>
                </div>
              ) : null}

              {/* Submit Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isIngesting || !activeSelectedKbId}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50 transition"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Index Content via Agno AgentOS
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

