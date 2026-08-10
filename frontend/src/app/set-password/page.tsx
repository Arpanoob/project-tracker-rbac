import { SetPasswordForm } from '@/components/set-password-form';

export default function SetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <SetPasswordForm mode="set" />
    </div>
  );
}
