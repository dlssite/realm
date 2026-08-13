import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../../app/stores/auth.store';
import {
  Bot, Key, Server, Cpu, Save, Check, AlertCircle, ShieldAlert,
  RefreshCw, ChevronDown, Zap, Lock, X, Plus, Wrench,
} from 'lucide-react';

type OpenRouterModel = {
  id: string;
  name: string;
  pricing?: { prompt: string; completion: string };
  context_length?: number;
  supported_parameters?: string[];
};

function isFreeModel(m: OpenRouterModel) {
  return parseFloat(m.pricing?.prompt ?? '1') === 0 && parseFloat(m.pricing?.completion ?? '1') === 0;
}

/** Returns true if the model supports Emberlyn's function/tool calling protocol */
function isToolCapable(m: OpenRouterModel) {
  return (
    Array.isArray(m.supported_parameters) &&
    m.supported_parameters.includes('tools') &&
    m.supported_parameters.includes('tool_choice')
  );
}

export function AiSettingsTab() {
  const { workspace, token } = useAuthStore();

  const [provider, setProvider] = useState<'OPENROUTER' | 'OLLAMA' | 'OPENAI' | 'ANTHROPIC'>('OPENROUTER');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [modelName, setModelName] = useState('anthropic/claude-3.5-sonnet');
  // The curated list the owner exposes to workspace members
  const [allowedModels, setAllowedModels] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);

  const [openRouterModels, setOpenRouterModels] = useState<OpenRouterModel[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!workspace || !token) return;
    fetchAiConfig();
  }, [workspace, token]);

  useEffect(() => {
    if (provider === 'OPENROUTER') fetchOpenRouterModels();
  }, [provider]);

  const fetchAiConfig = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `http://localhost:4000/api/v1/workspaces/${workspace!.id}/ai/config`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setProvider(data.provider || 'OPENROUTER');
        setApiKey(data.apiKey || '');
        setBaseUrl(data.baseUrl || '');
        setModelName(data.modelName || 'anthropic/claude-3.5-sonnet');
        setAllowedModels(data.allowedModels || []);
        setIsActive(data.isActive ?? true);
        setIsConfigured(data.isConfigured ?? false);
      }
    } catch (err) {
      console.error('Failed to load AI config', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOpenRouterModels = async () => {
    setIsFetchingModels(true);
    setModelsError(null);
    try {
      const res = await fetch('https://openrouter.ai/api/v1/models');
      if (!res.ok) throw new Error('Failed to fetch OpenRouter models');
      const data = await res.json();
      const models: OpenRouterModel[] = data.data || [];
      models.sort((a, b) => {
        const af = isFreeModel(a) ? 0 : 1;
        const bf = isFreeModel(b) ? 0 : 1;
        return af !== bf ? af - bf : a.name.localeCompare(b.name);
      });
      setOpenRouterModels(models);
    } catch {
      setModelsError('Could not fetch models. Enter IDs manually.');
    } finally {
      setIsFetchingModels(false);
    }
  };

  const toggleAllowed = (modelId: string) => {
    setAllowedModels((prev) =>
      prev.includes(modelId) ? prev.filter((m) => m !== modelId) : [...prev, modelId]
    );
  };

  const removeAllowed = (modelId: string) => {
    setAllowedModels((prev) => prev.filter((m) => m !== modelId));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace || !token) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const res = await fetch(
        `http://localhost:4000/api/v1/workspaces/${workspace!.id}/ai/config`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ provider, apiKey, baseUrl, modelName, allowedModels, isActive }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save AI configuration');
      setIsConfigured(data.isConfigured);
      setApiKey(data.apiKey || '');
      setAllowedModels(data.allowedModels || []);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const freeModels = openRouterModels.filter(isFreeModel);
  const paidModels = openRouterModels.filter((m) => !isFreeModel(m));

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="p-4 rounded-xl bg-[#0d0d10] border border-[#1f1f23] flex items-center space-x-3">
        <div className="p-2 rounded-lg bg-[#7c3aed]/10 text-[#7c3aed]">
          <Bot className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-[#fafafa]">Workspace AI Provider</h3>
          <p className="text-xs text-[#a1a1aa]">
            Set your API keys, choose a default model, and curate the model list available to your team.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/40 text-xs text-rose-300 flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* ── Section 1: Provider ── */}
        <div className="bg-[#0d0d10] border border-[#1f1f23] rounded-xl p-5 space-y-5">
          <p className="text-[11px] uppercase tracking-widest text-[#52525b] font-semibold">Provider & Credentials</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { id: 'OPENROUTER', label: 'OpenRouter',      sub: 'Multi-model gateway' },
              { id: 'OLLAMA',     label: 'Ollama (Local)',   sub: 'Zero-cloud, local' },
              { id: 'OPENAI',     label: 'OpenAI Direct',    sub: 'GPT-4o / o3' },
              { id: 'ANTHROPIC',  label: 'Anthropic Direct', sub: 'Claude 3.5+' },
            ].map((item) => (
              <button
                key={item.id} type="button"
                onClick={() => {
                  setProvider(item.id as any);
                  if (item.id === 'OLLAMA') setBaseUrl(baseUrl || 'http://localhost:11434');
                }}
                className={`p-3 rounded-lg text-left border transition flex flex-col ${
                  provider === item.id
                    ? 'bg-[#7c3aed]/15 border-[#7c3aed] text-white'
                    : 'bg-[#121215] border-[#1f1f23] text-[#a1a1aa] hover:border-[#27272a] hover:text-white'
                }`}
              >
                <span className="font-semibold text-xs text-[#fafafa]">{item.label}</span>
                <span className="text-[10px] text-[#71717a] mt-0.5">{item.sub}</span>
              </button>
            ))}
          </div>

          {provider !== 'OLLAMA' ? (
            <div>
              <label className="flex items-center space-x-1.5 text-xs font-semibold text-[#fafafa] mb-1.5">
                <Key className="w-3.5 h-3.5 text-[#7c3aed]" />
                <span>Workspace API Key</span>
              </label>
              <input
                type="password" value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={provider === 'OPENROUTER' ? 'sk-or-v1-...' : 'sk-...'}
                className="w-full bg-[#121215] border border-[#1f1f23] rounded-lg px-3 py-2 text-xs text-[#fafafa] placeholder-[#52525b] focus:outline-none focus:border-[#7c3aed] transition"
              />
              <p className="text-[11px] text-[#71717a] mt-1">Stored securely. Team members share this via the backend.</p>
            </div>
          ) : (
            <div>
              <label className="flex items-center space-x-1.5 text-xs font-semibold text-[#fafafa] mb-1.5">
                <Server className="w-3.5 h-3.5 text-[#7c3aed]" />
                <span>Ollama Endpoint URL</span>
              </label>
              <input
                type="text" value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="http://localhost:11434"
                className="w-full bg-[#121215] border border-[#1f1f23] rounded-lg px-3 py-2 text-xs text-[#fafafa] placeholder-[#52525b] focus:outline-none focus:border-[#7c3aed] transition"
              />
            </div>
          )}
        </div>

        {/* ── Section 2: Default Model ── */}
        <div className="bg-[#0d0d10] border border-[#1f1f23] rounded-xl p-5 space-y-3">
          <p className="text-[11px] uppercase tracking-widest text-[#52525b] font-semibold">Default Model</p>
          <p className="text-xs text-[#71717a]">
            Used when a member hasn't picked a specific model. Must also be in the allowed list below.
          </p>
          <div className="relative">
            <input
              type="text" value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder={provider === 'OLLAMA' ? 'llama3:latest' : 'anthropic/claude-3.5-sonnet'}
              className="w-full bg-[#121215] border border-[#1f1f23] rounded-lg px-3 py-2 text-xs text-[#fafafa] placeholder-[#52525b] focus:outline-none focus:border-[#7c3aed] transition"
            />
          </div>
        </div>

        {/* ── Section 3: Allowed Models (the curated list) ── */}
        <div className="bg-[#0d0d10] border border-[#1f1f23] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-[#52525b] font-semibold">Allowed Models for Members</p>
              <p className="text-xs text-[#71717a] mt-0.5">
                Members can switch between these on the AI page. Pick from the list or add custom IDs.
              </p>
            </div>
            {provider === 'OPENROUTER' && (
              <button
                type="button" onClick={fetchOpenRouterModels} disabled={isFetchingModels}
                className="flex items-center space-x-1 text-[11px] text-[#7c3aed] hover:text-[#a78bfa] transition"
              >
                <RefreshCw className={`w-3 h-3 ${isFetchingModels ? 'animate-spin' : ''}`} />
                <span>{isFetchingModels ? 'Fetching...' : 'Refresh'}</span>
              </button>
            )}
          </div>

          {/* Current allowed models as removable chips */}
          {allowedModels.length > 0 && (
            <div>
              <p className="text-[11px] text-[#52525b] mb-2">Selected ({allowedModels.length} models):</p>
              <div className="flex flex-wrap gap-2">
                {allowedModels.map((id) => {
                  // Look up tool capability from the live model list if available
                  const modelMeta = openRouterModels.find((m) => m.id === id);
                  const toolCapable = modelMeta ? isToolCapable(modelMeta) : false;
                  return (
                    <span
                      key={id}
                      className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-full bg-[#7c3aed]/10 border border-[#7c3aed]/30 text-[11px] text-[#a78bfa] font-medium"
                    >
                      {id.endsWith(':free') && <Zap className="w-3 h-3 text-emerald-400 flex-shrink-0" />}
                      {toolCapable && <Wrench className="w-3 h-3 text-[#a78bfa] flex-shrink-0" />}
                      <span className="truncate max-w-[160px]">{id}</span>
                      <button
                        type="button" onClick={() => removeAllowed(id)}
                        className="text-[#71717a] hover:text-rose-400 transition ml-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* OpenRouter model picker */}
          {provider === 'OPENROUTER' && (
            <div className="space-y-2">
              {isFetchingModels ? (
                <div className="text-xs text-[#52525b] flex items-center space-x-2 py-3">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#7c3aed]" />
                  <span>Fetching OpenRouter model catalogue...</span>
                </div>
              ) : openRouterModels.length > 0 ? (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                  {/* Free models */}
                  {freeModels.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-emerald-500 font-semibold mb-1.5 flex items-center space-x-1">
                        <Zap className="w-3 h-3" /><span>Free Models</span>
                      </p>
                      <div className="space-y-1">
                        {freeModels.map((model) => {
                          const checked = allowedModels.includes(model.id);
                          const toolCapable = isToolCapable(model);
                          return (
                            <label
                              key={model.id}
                              className={`flex items-center space-x-3 px-3 py-2 rounded-lg cursor-pointer transition ${
                                checked ? 'bg-emerald-950/20 border border-emerald-800/30' : 'hover:bg-[#121215] border border-transparent'
                              }`}
                            >
                              <input
                                type="checkbox" checked={checked}
                                onChange={() => toggleAllowed(model.id)}
                                className="w-3.5 h-3.5 rounded accent-emerald-500 flex-shrink-0"
                              />
                              <span className="text-xs text-[#e4e4e7] flex-1 truncate">{model.name}</span>
                              <div className="flex items-center space-x-1.5 flex-shrink-0">
                                {toolCapable && (
                                  <span className="flex items-center space-x-0.5 text-[9px] text-[#a78bfa] bg-[#7c3aed]/15 border border-[#7c3aed]/30 px-1.5 py-0.5 rounded font-semibold">
                                    <Wrench className="w-2.5 h-2.5" />
                                    <span>Tools</span>
                                  </span>
                                )}
                                <span className="text-[10px] text-emerald-400 font-medium">FREE</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {/* Paid models */}
                  {paidModels.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-amber-500 font-semibold mb-1.5 flex items-center space-x-1">
                        <Lock className="w-3 h-3" /><span>Paid Models</span>
                      </p>
                      <div className="space-y-1">
                        {paidModels.map((model) => {
                          const checked = allowedModels.includes(model.id);
                          const toolCapable = isToolCapable(model);
                          return (
                            <label
                              key={model.id}
                              className={`flex items-center space-x-3 px-3 py-2 rounded-lg cursor-pointer transition ${
                                checked ? 'bg-[#7c3aed]/10 border border-[#7c3aed]/30' : 'hover:bg-[#121215] border border-transparent'
                              }`}
                            >
                              <input
                                type="checkbox" checked={checked}
                                onChange={() => toggleAllowed(model.id)}
                                className="w-3.5 h-3.5 rounded accent-purple-500 flex-shrink-0"
                              />
                              <span className="text-xs text-[#e4e4e7] flex-1 truncate">{model.name}</span>
                              <div className="flex items-center space-x-1.5 flex-shrink-0">
                                {toolCapable && (
                                  <span className="flex items-center space-x-0.5 text-[9px] text-[#a78bfa] bg-[#7c3aed]/15 border border-[#7c3aed]/30 px-1.5 py-0.5 rounded font-semibold">
                                    <Wrench className="w-2.5 h-2.5" />
                                    <span>Tools</span>
                                  </span>
                                )}
                                <span className="text-[10px] text-[#71717a]">
                                  ${model.pricing?.prompt}/tk
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : modelsError ? (
                <p className="text-xs text-amber-400">{modelsError}</p>
              ) : null}
            </div>
          )}

          {/* Manual add for Ollama/other */}
          {provider !== 'OPENROUTER' && (
            <ManualModelInput onAdd={(id) => !allowedModels.includes(id) && setAllowedModels((p) => [...p, id])} />
          )}
        </div>

        {/* ── Save footer ── */}
        <div className="flex items-center justify-between pt-1">
          <div>
            {isConfigured ? (
              <span className="flex items-center text-xs text-emerald-400 font-medium">
                <Check className="w-3.5 h-3.5 mr-1" /> Active & Configured
              </span>
            ) : (
              <span className="flex items-center text-xs text-amber-400 font-medium">
                <AlertCircle className="w-3.5 h-3.5 mr-1" /> Needs API key or endpoint
              </span>
            )}
          </div>
          <button
            type="submit" disabled={isSaving}
            className="flex items-center space-x-1.5 px-4 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : saveSuccess ? '✓ Saved!' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

function ManualModelInput({ onAdd }: { onAdd: (id: string) => void }) {
  const [val, setVal] = useState('');
  return (
    <div className="flex items-center space-x-2">
      <input
        type="text" value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="e.g. llama3:latest or mistral:7b"
        className="flex-1 bg-[#121215] border border-[#1f1f23] rounded-lg px-3 py-2 text-xs text-[#fafafa] placeholder-[#52525b] focus:outline-none focus:border-[#7c3aed] transition"
      />
      <button
        type="button"
        onClick={() => { if (val.trim()) { onAdd(val.trim()); setVal(''); } }}
        className="p-2 rounded-lg bg-[#7c3aed]/15 border border-[#7c3aed]/30 text-[#a78bfa] hover:bg-[#7c3aed]/25 transition"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}

export default AiSettingsTab;
