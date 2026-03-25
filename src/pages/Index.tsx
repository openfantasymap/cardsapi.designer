import { useEffect } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { useGitHubStore } from '@/store/useGitHubStore';
import { getMe } from '@/services/github';
import { listRepos } from '@/services/api';
import { ProjectDashboard } from '@/components/ProjectDashboard';
import { CardEditor } from '@/components/CardEditor';
import { GitHubCallbackHandler } from '@/components/GitHubCallbackHandler';

const Index = () => {
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const { sessionToken, user, setUser, setRepos, setLoading, logout } = useGitHubStore();

  // Restore session on mount
  useEffect(() => {
    if (sessionToken && !user) {
      setLoading(true);
      getMe(sessionToken)
        .then((u) => {
          setUser(u);
          return listRepos(sessionToken);
        })
        .then((r) => setRepos(r))
        .catch(() => logout())
        .finally(() => setLoading(false));
    }
  }, [sessionToken]);

  return (
    <>
      <GitHubCallbackHandler />
      {activeProjectId ? <CardEditor /> : <ProjectDashboard />}
    </>
  );
};

export default Index;
