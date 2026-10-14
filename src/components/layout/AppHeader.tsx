import { LogOut, Plug } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';
import { McpKeyModal } from '../settings/McpKeyModal';

export function AppHeader() {
  const { user, logout } = useAuth();
  const [showMcpModal, setShowMcpModal] = useState(false);

  return (
    <header className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-3">
      <span className="text-lg font-semibold text-[var(--color-text)]">SynapseMCP</span>

      <div className="flex items-center gap-3">
        <span className="text-sm text-[var(--color-text-muted)]">{user?.fullName}</span>
        <Button variant="secondary" icon={<Plug className="size-4" />} onClick={() => setShowMcpModal(true)}>
          Connect External LLM
        </Button>
        <Button variant="ghost" icon={<LogOut className="size-4" />} onClick={logout}>
          Logout
        </Button>
      </div>

      {showMcpModal && <McpKeyModal onClose={() => setShowMcpModal(false)} />}
    </header>
  );
}
