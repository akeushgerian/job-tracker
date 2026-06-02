import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FullPageSpinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProfile } from '@/features/profile/api';
import { ProfileForm } from '@/features/profile/profile-form';
import { ReferencesManager } from '@/features/cover-letters/references-manager';
import { CoverLettersList } from '@/features/cover-letters/cover-letters-list';

export const Route = createFileRoute('/_authed/profile')({
  component: ProfilePage,
});

function ProfilePage() {
  const { data: profile, isLoading } = useProfile();
  if (isLoading) return <FullPageSpinner />;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Tell the assistant who you are — this powers your tailored cover letters.
        </p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="references">Letter references</TabsTrigger>
          <TabsTrigger value="letters">Cover letters</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardContent className="pt-6">
              <ProfileForm profile={profile ?? null} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="references">
          <Card>
            <CardHeader>
              <CardTitle>Format references</CardTitle>
            </CardHeader>
            <CardContent>
              <ReferencesManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="letters">
          <Card>
            <CardHeader>
              <CardTitle>Saved cover letters</CardTitle>
            </CardHeader>
            <CardContent>
              <CoverLettersList />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
