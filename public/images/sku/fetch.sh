#!/bin/bash
# Ticketa SKU 카드 이미지 일괄 다운로드 스크립트
# 사용법: bash /Users/carey-drtail/Projects/Requested/ticketa/public/images/sku/fetch.sh
# 실행 후 모든 백화점 5사 + 문화상품권 + 도서문화상품권 카드 이미지가 이 폴더에 저장된다.

set -u
cd "$(dirname "$0")"

UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'

dl() {
  local url="$1" file="$2" referer="${3:-}"
  echo "▶ $file"
  if [[ -n "$referer" ]]; then
    curl -sSfL -A "$UA" -e "$referer" "$url" -o "$file" \
      && echo "  ✓ $(stat -f %z "$file" 2>/dev/null) bytes" \
      || echo "  ✗ FAIL"
  else
    curl -sSfL -A "$UA" "$url" -o "$file" \
      && echo "  ✓ $(stat -f %z "$file" 2>/dev/null) bytes" \
      || echo "  ✗ FAIL"
  fi
}

# 롯데백화점 5/10/30만원권
dl "https://www.lotteshopping.com/resources/img/customer-service/lotte-voucher/50,000_voucher.png"  lotte-50000.png   "https://www.lotteshopping.com/serviceInformation/voucher"
dl "https://www.lotteshopping.com/resources/img/customer-service/lotte-voucher/100,000_voucher.png" lotte-100000.png  "https://www.lotteshopping.com/serviceInformation/voucher"
dl "https://www.lotteshopping.com/resources/img/customer-service/lotte-voucher/300,000_voucher.png" lotte-300000.png  "https://www.lotteshopping.com/serviceInformation/voucher"

# 신세계백화점 5/10/30만원권
dl "https://www.shinsegae.com/resources/site/img/service/membership/certificate/ico_giftcard_50000.png"  shinsegae-50000.png  "https://www.shinsegae.com/service/membership/certificate.do"
dl "https://www.shinsegae.com/resources/site/img/service/membership/certificate/ico_giftcard_100000.png" shinsegae-100000.png "https://www.shinsegae.com/service/membership/certificate.do"
dl "https://www.shinsegae.com/resources/site/img/service/membership/certificate/ico_giftcard_300000.png" shinsegae-300000.png "https://www.shinsegae.com/service/membership/certificate.do"

# 현대백화점 5/10/30만원권 (img_gift03=5만, 04=10만, 05=30만)
dl "https://www.ehyundai.com/images/mobilehome2/gift/img_gift03.png" hyundai-50000.png  "https://www.ehyundai.com/mobile/event/VC/voucher03.do"
dl "https://www.ehyundai.com/images/mobilehome2/gift/img_gift04.png" hyundai-100000.png "https://www.ehyundai.com/mobile/event/VC/voucher03.do"
dl "https://www.ehyundai.com/images/mobilehome2/gift/img_gift05.png" hyundai-300000.png "https://www.ehyundai.com/mobile/event/VC/voucher03.do"

# 갤러리아백화점 5/10/30만원권 (g-coupon-02=5만, 03=10만, 04=30만)
dl "https://dept.galleria.co.kr/assets/image/dept/card/coupon/introduction/g-coupon-02.jpg" galleria-50000.jpg  "https://dept.galleria.co.kr/card/coupon/introduction/galleria.html"
dl "https://dept.galleria.co.kr/assets/image/dept/card/coupon/introduction/g-coupon-03.jpg" galleria-100000.jpg "https://dept.galleria.co.kr/card/coupon/introduction/galleria.html"
dl "https://dept.galleria.co.kr/assets/image/dept/card/coupon/introduction/g-coupon-04.jpg" galleria-300000.jpg "https://dept.galleria.co.kr/card/coupon/introduction/galleria.html"

# AK플라자 5/10/30만원권
dl "https://img-www.akplaza.com/static/images/card/gift50000.png"  ak-50000.png  "https://www.akplaza.com/card/giftCard/paper"
dl "https://img-www.akplaza.com/static/images/card/gift100000.png" ak-100000.png "https://www.akplaza.com/card/giftCard/paper"
dl "https://img-www.akplaza.com/static/images/card/gift300000.png" ak-300000.png "https://www.akplaza.com/card/giftCard/paper"

# 문화상품권 (5천/1만/5만)
dl "https://www.culturegift.co.kr/images/purchase/img_giftcard_5000.png"  culturegift-5000.png  "https://www.culturegift.co.kr/purchase/"
dl "https://www.culturegift.co.kr/images/purchase/img_giftcard_10000.png" culturegift-10000.png "https://www.culturegift.co.kr/purchase/"
dl "https://www.culturegift.co.kr/images/purchase/img_giftcard_50000.png" culturegift-50000.png "https://www.culturegift.co.kr/purchase/"

# 도서문화상품권 (북앤라이프) - 권종별 공식 카드 이미지를 발행사가 공개하지 않아 알라딘 안내 이미지 사용
# 카드 디자인 통합 이미지 (5천/1만/5만권 함께 표시)
dl "https://image.aladin.co.kr/img/blog2/service/exchange_top.jpg" booknlife-card.jpg  "https://blog.aladin.co.kr/aladinservice/14934143"
# 알라딘 도서문화상품권 페이퍼 안내
dl "https://image.aladin.co.kr/Community/paper/2024/0321/pimg_7165501574229652.jpg" booknlife-paper.jpg "https://blog.aladin.co.kr/aladinservice/14934143"

echo
echo "── 결과 ──"
ls -la *.png *.jpg 2>/dev/null
