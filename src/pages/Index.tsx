import { useProjectStore } from '@/store/useProjectStore';
import { ProjectDashboard } from '@/components/ProjectDashboard';
import { CardEditor } from '@/components/CardEditor';

const Index = () => {
  const activeProjectId = useProjectStore((s) => s.activeProjectId);

  return activeProjectId ? <CardEditor /> : <ProjectDashboard />;
};

export default Index;
