import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAiSettings, useUpdateAiSettings } from '@/features/settings/api';

export const Route = createFileRoute('/_authed/settings/ai')({
  component: AiSettingsPage,
});

const DEFAULT_CLAUDE_MODEL = 'claude-haiku-4-5-20251001';

function AiSettingsPage() {
  const { data: settings, isLoading } = useAiSettings();
  const update = useUpdateAiSettings();

  const [provider, setProvider] = useState<'local' | 'claude'>('local');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(DEFAULT_CLAUDE_MODEL);

  useEffect(() => {
    if (settings) {
      setProvider(settings.provider);
      setModel(settings.claudeModel);
    }
  }, [settings]);

  const handleSave = () => {
    update.mutate({
      provider,
      claudeApiKey: provider === 'claude' && apiKey ? apiKey : undefined,
      claudeModel: model || DEFAULT_CLAUDE_MODEL,
    });
  };

  if (isLoading) return <p className="p-8 text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI Model</h1>
        <p className="text-sm text-muted-foreground">
          Choose which AI model powers email triage and classification.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Provider</CardTitle>
          <CardDescription>
            Local model uses the Ollama instance configured on the server. Claude API sends
            requests to Anthropic — your job data stays in your API key's account.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="radio"
                name="provider"
                value="local"
                checked={provider === 'local'}
                onChange={() => setProvider('local')}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium">Local model (Ollama)</p>
                <p className="text-xs text-muted-foreground">
                  Uses the <code className="font-mono">LLM_MODEL</code> configured in the
                  server environment. No external API calls.
                </p>
              </div>
            </label>

            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="radio"
                name="provider"
                value="claude"
                checked={provider === 'claude'}
                onChange={() => setProvider('claude')}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium">Claude API</p>
                <p className="text-xs text-muted-foreground">
                  Calls Anthropic's API using your key. Faster and more accurate on
                  multilingual emails.
                </p>
              </div>
            </label>
          </div>

          {provider === 'claude' && (
            <div className="flex flex-col gap-4 border-t border-border/60 pt-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" htmlFor="claude-api-key">
                  API key
                </label>
                <input
                  id="claude-api-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={
                    settings?.claudeApiKey ? '••••••••' : 'sk-ant-…'
                  }
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <p className="text-xs text-muted-foreground">
                  The API key is encrypted before storage. Leave blank to keep the existing key.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" htmlFor="claude-model">
                  Model
                </label>
                <input
                  id="claude-model"
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={update.isPending} size="sm">
              {update.isPending ? 'Saving…' : 'Save'}
            </Button>
            {update.isSuccess && (
              <p className="text-xs text-green-600">Settings saved.</p>
            )}
            {update.isError && (
              <p className="text-xs text-destructive">Failed to save. Please try again.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
