'use server';

import { revalidatePath, updateTag } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAuth, requireRole } from '@/lib/auth/guards';
import { withServerAction } from '@/lib/server-actions';
import { insertAuditEvent } from '@/lib/domain/audit';
import { skuCreateSchema, skuUpdateSchema, skuToggleSchema } from '@/lib/domain/schemas/sku';

const THUMB_BUCKET = 'sku-thumbnails';
const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

function readCommissionFields(formData: FormData) {
  const type = formData.get('commission_type');
  const amount = formData.get('commission_amount');
  const chargedTo = formData.get('commission_charged_to');
  return {
    commission_type: type || undefined,
    commission_amount: amount !== null && amount !== '' ? amount : undefined,
    commission_charged_to: chargedTo || undefined,
  };
}

function slugifyBrand(brand: string): string {
  // 한글 brand("롯데백화점") 그대로 키 경로에 쓰면 Storage 가 거부할 수 있어 ASCII 슬러그로 치환.
  const map: Record<string, string> = {
    롯데백화점: 'lotte',
    현대백화점: 'hyundai',
    신세계백화점: 'shinsegae',
    갤러리아백화점: 'galleria',
    AK백화점: 'ak',
  };
  return map[brand] ?? (brand.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'misc');
}

async function uploadThumbnail(
  supabase: SupabaseClient,
  file: File,
  brand: string,
  denomination: number,
): Promise<string> {
  if (!ALLOWED_MIME.includes(file.type)) {
    throw Object.assign(new Error('이미지 형식이 지원되지 않아요 (png/jpg/webp/gif/svg)'), {
      code: 'INVALID_FILE',
    });
  }
  if (file.size === 0) {
    throw Object.assign(new Error('빈 파일은 업로드할 수 없어요'), { code: 'INVALID_FILE' });
  }
  if (file.size > MAX_BYTES) {
    throw Object.assign(new Error('이미지는 5MB 이하만 업로드할 수 있어요'), {
      code: 'INVALID_FILE',
    });
  }
  const ext = (file.name.split('.').pop() || file.type.split('/')[1] || 'bin').toLowerCase();
  const path = `${slugifyBrand(brand)}/${denomination}-${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from(THUMB_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true });
  if (upErr) {
    throw Object.assign(new Error(`썸네일 업로드 실패: ${upErr.message}`), {
      code: 'UPLOAD_FAILED',
    });
  }
  const { data } = supabase.storage.from(THUMB_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function createSkuAction(formData: FormData) {
  return withServerAction('createSku', async () => {
    await requireRole('admin');
    const user = await requireAuth();

    const commission = readCommissionFields(formData);

    const parsed = skuCreateSchema.safeParse({
      brand: formData.get('brand'),
      denomination: formData.get('denomination'),
      display_order: formData.get('display_order'),
      commission_type: commission.commission_type ?? 'fixed',
      commission_amount: commission.commission_amount ?? 0,
      commission_charged_to: commission.commission_charged_to ?? 'seller',
    });
    if (!parsed.success) {
      throw Object.assign(
        new Error(parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다'),
        {
          code: 'VALIDATION',
        },
      );
    }

    const supabase = await createSupabaseServerClient();

    // Optional thumbnail upload
    let thumbnail_url: string | null = null;
    const thumbFile = formData.get('thumbnail');
    if (thumbFile instanceof File && thumbFile.size > 0) {
      thumbnail_url = await uploadThumbnail(
        supabase,
        thumbFile,
        parsed.data.brand,
        parsed.data.denomination,
      );
    }

    const { data: sku, error } = await supabase
      .from('sku')
      .insert({ ...parsed.data, thumbnail_url })
      .select(
        'id, brand, denomination, display_order, is_active, thumbnail_url, commission_type, commission_amount, commission_charged_to',
      )
      .single();

    if (error) {
      if (error.code === '23505') {
        throw Object.assign(new Error('이미 존재하는 SKU 입니다'), { code: 'DUPLICATE' });
      }
      throw Object.assign(new Error(error.message), { code: 'DB_ERROR' });
    }

    await insertAuditEvent(supabase, {
      actor_id: user.id,
      entity_type: 'sku',
      entity_id: sku.id,
      event: 'created',
      metadata: {
        brand: sku.brand,
        denomination: sku.denomination,
        display_order: sku.display_order,
        thumbnail_url: sku.thumbnail_url,
        commission_type: sku.commission_type,
        commission_amount: sku.commission_amount,
        commission_charged_to: sku.commission_charged_to,
      },
    });

    revalidatePath('/admin/catalog');
    // /sell/new 의 unstable_cache 무효화 — 다음 sell/new 진입부터 새 SKU 목록 보임.
    updateTag('sku-active');
    return sku;
  });
}

export async function updateSkuAction(formData: FormData) {
  return withServerAction('updateSku', async () => {
    await requireRole('admin');
    const user = await requireAuth();

    const commission = readCommissionFields(formData);

    const parsed = skuUpdateSchema.safeParse({
      id: formData.get('id'),
      brand: formData.get('brand') || undefined,
      denomination: formData.get('denomination') || undefined,
      display_order:
        formData.get('display_order') !== null && formData.get('display_order') !== ''
          ? formData.get('display_order')
          : undefined,
      commission_type: commission.commission_type,
      commission_amount: commission.commission_amount,
      commission_charged_to: commission.commission_charged_to,
    });
    if (!parsed.success) {
      throw Object.assign(
        new Error(parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다'),
        {
          code: 'VALIDATION',
        },
      );
    }

    const { id, ...fields } = parsed.data;

    const supabase = await createSupabaseServerClient();

    // Fetch before state for audit diff + thumbnail path defaults
    const { data: before } = await supabase
      .from('sku')
      .select(
        'brand, denomination, display_order, is_active, thumbnail_url, commission_type, commission_amount, commission_charged_to',
      )
      .eq('id', id)
      .single();

    // 썸네일 처리: 새 파일 업로드 / 제거 / 그대로 두기
    const thumbFile = formData.get('thumbnail');
    const removeThumb = formData.get('remove_thumbnail') === '1';
    const updates: Record<string, unknown> = { ...fields };
    if (thumbFile instanceof File && thumbFile.size > 0) {
      updates.thumbnail_url = await uploadThumbnail(
        supabase,
        thumbFile,
        fields.brand ?? before?.brand ?? '',
        fields.denomination ?? before?.denomination ?? 0,
      );
    } else if (removeThumb) {
      updates.thumbnail_url = null;
    }

    const { data: sku, error } = await supabase
      .from('sku')
      .update(updates)
      .eq('id', id)
      .select(
        'id, brand, denomination, display_order, is_active, thumbnail_url, commission_type, commission_amount, commission_charged_to',
      )
      .single();

    if (error) {
      if (error.code === '23505') {
        throw Object.assign(new Error('이미 존재하는 SKU 입니다'), { code: 'DUPLICATE' });
      }
      throw Object.assign(new Error(error.message), { code: 'DB_ERROR' });
    }

    await insertAuditEvent(supabase, {
      actor_id: user.id,
      entity_type: 'sku',
      entity_id: sku.id,
      event: 'updated',
      metadata: {
        before,
        after: {
          brand: sku.brand,
          denomination: sku.denomination,
          display_order: sku.display_order,
          thumbnail_url: sku.thumbnail_url,
          commission_type: sku.commission_type,
          commission_amount: sku.commission_amount,
          commission_charged_to: sku.commission_charged_to,
        },
      },
    });

    revalidatePath('/admin/catalog');
    // /sell/new 의 unstable_cache 무효화 — 다음 sell/new 진입부터 새 SKU 목록 보임.
    updateTag('sku-active');
    return sku;
  });
}

export async function toggleSkuActiveAction(formData: FormData) {
  return withServerAction('toggleSkuActive', async () => {
    await requireRole('admin');
    const user = await requireAuth();

    const parsed = skuToggleSchema.safeParse({
      id: formData.get('id'),
      is_active: formData.get('is_active'),
    });
    if (!parsed.success) {
      throw Object.assign(
        new Error(parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다'),
        {
          code: 'VALIDATION',
        },
      );
    }

    const { id, is_active } = parsed.data;
    const supabase = await createSupabaseServerClient();

    const { data: sku, error } = await supabase
      .from('sku')
      .update({ is_active })
      .eq('id', id)
      .select('id, brand, denomination, is_active')
      .single();

    if (error) {
      throw Object.assign(new Error(error.message), { code: 'DB_ERROR' });
    }

    await insertAuditEvent(supabase, {
      actor_id: user.id,
      entity_type: 'sku',
      entity_id: sku.id,
      event: is_active ? 'activated' : 'deactivated',
      from_state: is_active ? 'inactive' : 'active',
      to_state: is_active ? 'active' : 'inactive',
      metadata: { brand: sku.brand, denomination: sku.denomination },
    });

    revalidatePath('/admin/catalog');
    // /sell/new 의 unstable_cache 무효화 — 다음 sell/new 진입부터 새 SKU 목록 보임.
    updateTag('sku-active');
    return sku;
  });
}
