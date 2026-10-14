import { useState, type FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import { extractErrorMessage } from '../../services/api';
import { Button } from '../common/Button';
import { Card } from '../common/Card';

export function LoginForm({ onSwitchToSignup }: { onSwitchToSignup: () => void }) {
  const { signin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFieldError(null);
    setLoading(true);
    try {
      await signin({ email, password });
    } catch (err) {
      setFieldError(extractErrorMessage(err, 'Invalid email or password.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <h1 className="mb-1 text-xl font-semibold text-[var(--color-text)]">Sign in to SynapseMCP</h1>
      <p className="mb-5 text-sm text-[var(--color-text-muted)]">Your unified knowledge base is waiting.</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-[var(--color-text)]">
          Email
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm outline-none
              focus:border-[var(--color-accent)]"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[var(--color-text)]">
          Password
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm outline-none
              focus:border-[var(--color-accent)]"
          />
        </label>
        {fieldError && <p className="text-sm text-[var(--color-danger)]">{fieldError}</p>}
        <Button type="submit" loading={loading} className="mt-2 w-full">
          Sign in
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-[var(--color-text-muted)]">
        Don't have an account?{' '}
        <button onClick={onSwitchToSignup} className="font-medium text-[var(--color-accent)]">
          Sign up
        </button>
      </p>
    </Card>
  );
}
