import { redirect } from 'next/navigation';

// 선물 흐름은 준비 중. 직접 접근하면 안내 페이지로 보낸다.
export default function GiftDetailPage(): never {
  redirect('/account/gift');
}
