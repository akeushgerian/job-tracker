import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Trash2, Users, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/empty-state';
import { useContacts, useCreateContact, useDeleteContact } from './api';

export function ContactsTab({ applicationId }: { applicationId: string }) {
  const { data, isLoading } = useContacts(applicationId);
  const remove = useDeleteContact(applicationId);

  if (isLoading) return <Spinner className="text-muted-foreground" />;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <AddContactDialog applicationId={applicationId} />
      </div>

      {(data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={Users}
          title="No contacts yet"
          description="Track recruiters, hiring managers, and referrals here."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {data!.map((contact) => (
            <div
              key={contact.id}
              className="flex items-start justify-between gap-2 rounded-lg border border-border p-4"
            >
              <div>
                <p className="font-medium">{contact.name}</p>
                {contact.role && (
                  <p className="text-sm text-muted-foreground">{contact.role}</p>
                )}
                <div className="mt-2 flex flex-col gap-1 text-sm">
                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}`}
                      className="flex items-center gap-1.5 text-primary hover:underline"
                    >
                      <Mail className="h-3.5 w-3.5" /> {contact.email}
                    </a>
                  )}
                  {contact.phone && (
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" /> {contact.phone}
                    </span>
                  )}
                </div>
                {contact.notes && (
                  <p className="mt-2 whitespace-pre-wrap text-sm">{contact.notes}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive"
                onClick={() => remove.mutate(contact.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface AddForm {
  name: string;
  role: string;
  email: string;
  phone: string;
  notes: string;
}

function AddContactDialog({ applicationId }: { applicationId: string }) {
  const [open, setOpen] = useState(false);
  const create = useCreateContact(applicationId);
  const { register, handleSubmit, reset } = useForm<AddForm>();

  const onSubmit = handleSubmit(async (values) => {
    await create.mutateAsync({
      name: values.name,
      role: values.role || undefined,
      email: values.email || undefined,
      phone: values.phone || undefined,
      notes: values.notes || undefined,
    });
    reset();
    setOpen(false);
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Add contact
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add contact</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Name</Label>
            <Input required {...register('name')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Role</Label>
            <Input {...register('role')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Email</Label>
            <Input type="email" {...register('email')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Phone</Label>
            <Input {...register('phone')} />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label>Notes</Label>
            <Textarea rows={2} {...register('notes')} />
          </div>
          <div className="col-span-2 flex justify-end">
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Spinner />}
              Add
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
