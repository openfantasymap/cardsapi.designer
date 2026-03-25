import { useGitHubStore } from '@/store/useGitHubStore';
import { initiateGitHubAuth, logout as apiLogout } from '@/services/github';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Github, LogOut, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const GitHubAuthButton = () => {
  const { sessionToken, user, loading, logout } = useGitHubStore();

  const handleLogin = async () => {
    try {
      const url = await initiateGitHubAuth(window.location.href);
      window.location.href = url;
    } catch {
      toast.error('Failed to start GitHub login');
    }
  };

  const handleLogout = async () => {
    if (sessionToken) {
      await apiLogout(sessionToken).catch(() => {});
    }
    logout();
    toast.success('Logged out');
  };

  if (loading) {
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
        <DropdownMenuItem onClick={handleLogout} className="text-xs gap-2 text-destructive">
          <LogOut size={12} /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
