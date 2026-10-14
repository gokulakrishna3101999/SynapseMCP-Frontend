import { useState, type FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import { extractErrorMessage } from '../../services/api';
import { Button } from '../common/Button';
import { Card } from '../common/Card';

export function SignupForm({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const { signup } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFieldError(null);
    setLoading(true);
    try {
      await signup({ email, password, fullName });
    } catch (err) {
      setFieldError(extractErrorMessage(err, 'Could not create your account.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <h1 className="mb-1 text-xl font-semibold text-[var(--color-text)]">Create your account</h1>
      <p className="mb-5 text-sm text-[var(--color-text-muted)]">
        One account, one unified knowledge base - no setup required.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-[var(--color-text)]">
          Full name
          <input
            type="text"
            required
            maxLength={255}
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm outline-none
              focus:border-[var(--color-accent)]"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[var(--color-text)]">
          Email
          <input
            type="email"
            required
            maxLength={255}
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
            minLength={8}
            maxLength={72}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm outline-none
              focus:border-[var(--color-accent)]"
          />
          <span className="text-xs text-[var(--color-text-muted)]">At least 8 characters.</span>
        </label>
        {fieldError && <p className="text-sm text-[var(--color-danger)]">{fieldError}</p>}
        <Button type="submit" loading={loading} className="mt-2 w-full">
          Create account
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-[var(--color-text-muted)]">
        Already have an account?{' '}
        <button onClick={onSwitchToLogin} className="font-medium text-[var(--color-accent)]">
          Sign in
        </button>
      </p>
    </Card>
  );
}
