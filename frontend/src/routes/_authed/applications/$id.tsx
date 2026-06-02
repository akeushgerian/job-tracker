import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, PenLine } from 'lucide-react';
import { useApplication } from '@/features/applications/api';
import { OverviewTab } from '@/features/applications/overview-tab';
import { InterviewsTab } from '@/features/interviews/interviews-tab';
import { ContactsTab } from '@/features/contacts/contacts-tab';
import { FollowUpsTab } from '@/features/follow-ups/follow-ups-tab';
import { ActivityTab } from '@/features/activities/activity-tab';
import { CoverLetterDialog } from '@/features/cover-letters/cover-letter-dialog';
import { CoverLettersList } from '@/features/cover-letters/cover-letters-list';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { FullPageSpinner } from '@/components/ui/spinner';

export const Route = createFileRoute('/_authed/applications/$id')({
  component: ApplicationDetailPage,
});

function ApplicationDetailPage() {
  const { id } = Route.useParams();
  const { data: application, isLoading, isError } = useApplication(id);

  if (isLoading) return <FullPageSpinner />;
  if (isError || !application) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-muted-foreground">This application could not be found.</p>
        <Link to="/applications" className="text-primary hover:underline">
          Back to pipeline
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-5 py-8">
      <div>
        <Link
          to="/applications"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Pipeline
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {application.positionTitle}
            </h1>
            <p className="text-muted-foreground">{application.companyName}</p>
          </div>
          <CoverLetterDialog
            applicationId={application.id}
            jobTitle={application.positionTitle}
            jobCompany={application.companyName}
            trigger={
              <Button variant="outline" size="sm">
                <PenLine className="h-4 w-4 text-brass" />
                Write cover letter
              </Button>
            }
          />
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="interviews">Interviews</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="follow-ups">Follow-ups</TabsTrigger>
          <TabsTrigger value="letters">Cover letters</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab application={application} />
        </TabsContent>
        <TabsContent value="interviews">
          <InterviewsTab applicationId={application.id} />
        </TabsContent>
        <TabsContent value="contacts">
          <ContactsTab applicationId={application.id} />
        </TabsContent>
        <TabsContent value="follow-ups">
          <FollowUpsTab applicationId={application.id} />
        </TabsContent>
        <TabsContent value="letters">
          <CoverLettersList applicationId={application.id} />
        </TabsContent>
        <TabsContent value="activity">
          <ActivityTab applicationId={application.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
