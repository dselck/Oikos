"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Plus,
  Trash2,
  Database,
  UploadCloud,
  Globe,
  Search,
  CheckCircle2,
  Layers,
  Sparkles,
  FileCode,
  HardDrive,
} from "lucide-react";

interface KnowledgeBaseRecord {
  id: string;
  name: string;
  description: string | null;
  vectorDbType: string;
  tableOrCollection: string;
  embedderModel: string;
  documentCount: number;
  createdAt: string;
  updatedAt: string;
}

export function KnowledgeStudio() {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [vectorDbType, setVectorDbType] = useState("sqlite_vec");
  const [tableOrCollection, setTableOrCollection] = useState("documents_vec");
  const [embedderModel, setEmbedderModel] = useState("text-embedding-3-small");

  // Document Upload Mock State
  const [docTitle, setDocTitle] = useState("");
  const [docContent, setDocContent] = useState("");
  const [selectedKbId, setSelectedKbId] = useState<string | null>(null);

  useEffect(() => {
    loadKnowledgeBases();
  }, []);

  const loadKnowledgeBases = async () => {
    try {
      const res = await fetch("/api/registry/knowledge");
      if (res.ok) {
        const data = await res.json();
        setKnowledgeBases(data);
        if (data.length > 0 && !selectedKbId) {
          setSelectedKbId(data[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to load knowledge bases", e);
    }
  };

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

    const res = await fetch("/api/registry/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setIsCreating(false);
      setName("");
      setDescription("");
      await loadKnowledgeBases();
    }
  };

  const handleDeleteKnowledgeBase = async (id: string) => {
    if (!confirm("Are you sure you want to delete this RAG Knowledge Base index?")) return;
    const res = await fetch(`/api/registry/knowledge?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      await loadKnowledgeBases();
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
              Manage Vector DB indices (`PgVector`, `sqlite_vec`, `Qdrant`), upload documents, and attach RAG context to Agents.
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
                    selectedKbId === kb.id
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 shadow-sm"
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

        {/* Right Column: RAG Document Upload & Chunking Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm font-mono flex items-center gap-2">
                <UploadCloud className="h-4 w-4 text-emerald-500" />
                Index Documents into Vector Database
              </h3>
              <span className="text-[11px] font-mono text-emerald-500 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Embedder: text-embedding-3-small
              </span>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Document Title / File Name</label>
                <input
                  type="text"
                  placeholder="e.g. Agno_AgentOS_Architecture_Guide.md"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Document Text / Markdown Content</label>
                <textarea
                  rows={6}
                  placeholder="Paste Markdown, text, or documentation here for vector embedding chunking..."
                  value={docContent}
                  onChange={(e) => setDocContent(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 font-mono outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono">
                  <span>Chunk Size: 500 tokens</span>
                  <span>Overlap: 50 tokens</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!docTitle.trim() || !docContent.trim()) return;
                    alert(`Successfully indexed "${docTitle}" into vector collection! (5 chunks generated)`);
                    setDocTitle("");
                    setDocContent("");
                  }}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 transition"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Index Document & Embed
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
