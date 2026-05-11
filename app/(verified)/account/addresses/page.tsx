import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { MyRoomShell } from '@/components/account/my-room-shell';
import { AddressList } from './address-list';

type AddressRow = {
  id: string;
  label: string | null;
  recipient_name: string;
  recipient_phone: string;
  postal_code: string;
  address1: string;
  address2: string | null;
  is_default: boolean;
  created_at: string;
};

export default async function AddressesPage() {
  const current = await getCurrentUser();
  if (!current) redirect('/login?next=/account/addresses');

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('shipping_addresses')
    .select(
      'id, label, recipient_name, recipient_phone, postal_code, address1, address2, is_default, created_at',
    )
    .eq('user_id', current.auth.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  const rows = (data ?? []) as AddressRow[];

  return (
    <MyRoomShell active="address">
      <div className="w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">배송지</h1>
          <p className="text-muted-foreground mt-1 text-[15px]">
            선물 현물 수령 시 사용할 배송지를 등록·관리해요. 기본 배송지는 1개만 지정할 수 있어요.
          </p>
        </div>

        <AddressList initial={rows} />
      </div>
    </MyRoomShell>
  );
}
