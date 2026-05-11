/**
 * 어드민 intake — 공유 상수.
 * server action 파일('use server') 에는 async function 만 export 해야 클라이언트에서 정상
 * 동작하므로, 상수는 이 파일에서 분리해서 export 한다.
 */
export const SHIPPING_CARRIERS = [
  { code: 'kpost', label: '우체국' },
  { code: 'cj', label: 'CJ대한통운' },
  { code: 'hanjin', label: '한진' },
  { code: 'lotte', label: '롯데' },
  { code: 'logen', label: '로젠' },
  { code: 'cvs_cu', label: '편의점 CU' },
  { code: 'cvs_gs25', label: '편의점 GS25' },
  { code: 'cvs_emart24', label: '편의점 이마트24' },
  { code: 'cvs_seven', label: '편의점 세븐일레븐' },
  { code: 'etc', label: '기타' },
] as const;

export type ShippingCarrierCode = (typeof SHIPPING_CARRIERS)[number]['code'];
