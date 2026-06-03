import { useEffect } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { useGitHubStore } from '@/store/useGitHubStore';
import { getUser } from '@/services/githubApi';
import { ProjectDashboard } from '@/components/ProjectDashboard';
import { CardEditor } from '@/components/CardEditor';

const Index = () => {
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const { token, user, setUser, setLoading, logout } = useGitHubStore();

  // Restore the GitHub session on mount: validate the stored token by fetching
  // the user. There is no OAuth redirect to handle anymore.
  useEffect(() => {
    if (token && !user) {
      setLoading(true);
      getUser(token)
        .then((u) => setUser(u))
        .catch(() => logout())
        .finally(() => setLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return activeProjectId ? <CardEditor /> : <ProjectDashboard />;
};

export default Index;
