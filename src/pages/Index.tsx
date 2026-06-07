import { useRestoreGitHubSession } from '@/hooks/useRestoreGitHubSession';
import { ProjectDashboard } from '@/components/ProjectDashboard';

/** Home: the project dashboard. The editor lives at /e/:slug. */
const Index = () => {
  useRestoreGitHubSession();
  return <ProjectDashboard />;
};

export default Index;
