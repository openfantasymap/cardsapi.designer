import { useGitHubStore } from '@/store/useGitHubStore';
import { login } from '@/services/githubAuth';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Github, LogOut, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const GitHubAuthButton = () => {
  const { token, user, loading, logout } = useGitHubStore();

  const handleLogin = async () => {
    try {
      await login(window.location.pathname + window.location.search);
    } catch (e) {
      toast.error((e as Error).message || 'Failed to start GitHub login');
    }
  };

  if (loading && token && !user) {
    return (
      <Button variant="outline" size="sm" className="gap-2 text-xs" disabled>
        <Loader2 size={14} className="animate-spin" /> Connecting…
      </Button>
    );
  }

  if (!user) {
    return (
      <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={handleLogin}>
        <Github size={14} /> Sign in with GitHub
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-xs h-8 px-2">
          <img src={user.avatar_url} alt={user.login} className="w-5 h-5 rounded-full" />
          <span className="text-foreground font-display">{user.login}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => { logout(); toast.success('Logged out'); }} className="text-xs gap-2 text-destructive">
          <LogOut size={12} /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
