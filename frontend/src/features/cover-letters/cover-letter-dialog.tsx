import { useState } from 'react';
import { Sparkles, Copy, Check } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  useCoverLetterReferences,
  useGenerateCoverLetter,
  useUpdateCoverLetter,
  type GenerateCoverLetterInput,
} from './api';

type JobMode = 'paste' | 'url';
const NONE = '__none__';

interface Props {
  trigger: React.ReactNode;
  applicationId?: string;
  jobTitle?: string;
  jobCompany?: string;
}

export function CoverLetterDialog({ trigger, applicationId, jobTitle, jobCompany }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<JobMode>('paste');
  const [jobText, setJobText] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [referenceId, setReferenceId] = useState<string>(NONE);
  const [tone, setTone] = useState('');
  const [result, setResult] = useState('');
  const [letterId, setLetterId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const references = useCoverLetterReferences();
  const generate = useGenerateCoverLetter();
  const update = useUpdateCoverLetter();

  const onGenerate = async () => {
    setError(null);
    const input: GenerateCoverLetterInput = {
      applicationId,
      jobTitle,
      jobCompany,
      tone: tone || undefined,
      referenceId: referenceId === NONE ? undefined : referenceId,
    };
    if (mode === 'paste') input.jobText = jobText.trim() || undefined;
    else input.jobUrl = jobUrl.trim() || undefined;

    try {
      const letter = await generate.mutateAsync(input);
      setResult(letter.content);
      setLetterId(letter.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Generation failed');
    }
  };

  const onSaveEdits = async () => {
    if (!letterId) return;
    await update.mutateAsync({ id: letterId, content: result });
  };

  const onCopy = async () => {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Write a cover letter
            {jobCompany ? ` — ${jobCompany}` : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <ModeTab active={mode === 'paste'} onClick={() => setMode('paste')}>
              Paste posting
            </ModeTab>
            <ModeTab active={mode === 'url'} onClick={() => setMode('url')}>
              From URL
            </ModeTab>
          </div>

          {mode === 'paste' ? (
            <Textarea
              rows={6}
              placeholder="Paste the job posting text here…"
              value={jobText}
              onChange={(e) => setJobText(e.target.value)}
            />
          ) : (
            <Input
              placeholder="https://…"
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
            />
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Format reference</Label>
              <Select value={referenceId} onValueChange={setReferenceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Free style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Free style</SelectItem>
                  {(references.data ?? []).map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Tone (optional)</Label>
              <Input
                placeholder="Warm, concise, confident…"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
              />
            </div>
          </div>

          <Button onClick={onGenerate} disabled={generate.isPending}>
            {generate.isPending ? <Spinner /> : <Sparkles className="h-4 w-4 text-brass" />}
            {result ? 'Regenerate' : 'Generate'}
          </Button>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {result && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>Cover letter</Label>
                <button
                  type="button"
                  onClick={onCopy}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <Textarea
                rows={14}
                value={result}
                onChange={(e) => setResult(e.target.value)}
              />
              <div className="flex justify-end">
                <Button variant="outline" onClick={onSaveEdits} disabled={update.isPending}>
                  {update.isPending && <Spinner />}
                  Save edits
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ModeTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'rounded-md px-3 py-1.5 text-sm font-medium transition-colors ' +
        (active
          ? 'bg-accent text-foreground'
          : 'text-muted-foreground hover:text-foreground')
      }
    >
      {children}
    </button>
  );
}
