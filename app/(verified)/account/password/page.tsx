import { MyRoomShell } from '@/components/account/my-room-shell';
import { PasswordForm } from './password-form';

export default function PasswordPage() {
  return (
    <MyRoomShell active="security">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">비밀번호 변경</h1>
        <p className="text-muted-foreground mt-1 text-sm">3개월에 한 번 변경하시는 걸 권장해요</p>
      </header>
      <PasswordForm />
    </MyRoomShell>
  );
}
