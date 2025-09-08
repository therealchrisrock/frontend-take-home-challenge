import { getServerAuthSession } from "~/server/auth";
import { redirect } from "next/navigation";
import ProfileManagement from "~/components/profile/ProfileManagement";
import StatsSection from "~/components/profile/StatsSection";
import MatchHistory from "~/components/profile/MatchHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

export default async function ProfilePage() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">Profile</h1>
      
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
          <TabsTrigger value="history">Match History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <ProfileManagement userId={session.user.id} />
        </TabsContent>
        
        <TabsContent value="stats" className="space-y-6">
          <StatsSection userId={session.user.id} />
        </TabsContent>
        
        <TabsContent value="history" className="space-y-6">
          <MatchHistory userId={session.user.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}