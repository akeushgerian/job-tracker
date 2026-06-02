import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import {
  useCoverLetterReferences,
  useCreateReference,
  useDeleteReference,
} from './api';

export function ReferencesManager() {
  const { data, isLoading } = useCoverLetterReferences();
  const create = useCreateReference();
  const remove = useDeleteReference();
  const [label, setLabel] = useState('');
  const [content, setContent] = useState('');

  const onAdd = async () => {
    if (!label.trim() || !content.trim()) return;
    await create.mutateAsync({ label: label.trim(), content: content.trim() });
    setLabel('');
    setContent('');
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Save sample cover letters here. When you generate, pick one and the AI will match
        its structure and tone.
      </p>

      {isLoading ? (
        <Spinner />
      ) : (
        <ul className="flex flex-col gap-2">
          {(data ?? []).map((ref) => (
            <li
              key={ref.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border/70 bg-card px-3 py-2"
            >
              <span className="text-sm font-medium">{ref.label}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => remove.mutate(ref.id)}
                disabled={remove.isPending}
                title="Delete reference"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2 border-t border-border/60 pt-4">
        <Label>New reference</Label>
        <Input
          placeholder="Label (e.g. My standard style)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <Textarea
          rows={6}
          placeholder="Paste a sample cover letter…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={onAdd}
            disabled={create.isPending || !label.trim() || !content.trim()}
          >
            {create.isPending && <Spinner />}
            Add reference
          </Button>
        </div>
      </div>
    </div>
  );
}
