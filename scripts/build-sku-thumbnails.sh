#!/usr/bin/env bash
# build-sku-thumbnails.sh
# 모든 백화점 상품권 원본 이미지를 474×474 1:1 레터박스 webp 로 일괄 변환.
# 원본 코너 픽셀로 패딩 → 카드 배경과 매끄럽게 연결됨.

set -euo pipefail

SRC_ROOT="${1:-/Users/carey-drtail/Desktop/giftcard/_backup}"
DST_ROOT="${2:-public/sku-thumbnails}"
SIZE="${3:-474}"
INNER_PCT="${4:-80}"  # 컨텐츠가 차지할 캔버스 비율 (%). 나머지 = letterbox/pillarbox 패딩.

if ! command -v magick >/dev/null 2>&1; then
  echo "ImageMagick(magick) 필요" >&2
  exit 1
fi

# src_dir → dst_brand 매핑
declare -a JOBS=(
  "lotte:lotte"
  "ak:ak"
  "hyundai:hyundai"
  "galleria:galleria"
  "ssg:shinsegae"
)

process() {
  local src_dir="$1"
  local dst_brand="$2"
  local src_path="$SRC_ROOT/$src_dir"
  local dst_dir="$DST_ROOT/$dst_brand"

  [ -d "$src_path" ] || { echo "skip (no src dir): $src_path"; return; }
  mkdir -p "$dst_dir"

  for f in "$src_path"/*; do
    [ -f "$f" ] || continue
    base=$(basename "$f")
    deno=$(echo "$base" | tr -d -c '0-9')
    [ -z "$deno" ] && { echo "skip (no number): $base"; continue; }

    bg=$(magick identify -format "%[pixel:p{0,0}]" "$f")
    dst="$dst_dir/${deno}.webp"
    inner=$(( SIZE * INNER_PCT / 100 ))

    magick "$f" \
      -background "$bg" \
      -resize "${inner}x${inner}" \
      -gravity center \
      -extent "${SIZE}x${SIZE}" \
      -quality 92 \
      "$dst"

    echo "  $dst_brand/${deno}.webp  (bg=$bg, inner=${inner}px)"
  done
}

echo "→ output: $DST_ROOT  size=${SIZE}×${SIZE}"
for job in "${JOBS[@]}"; do
  src="${job%%:*}"
  dst="${job##*:}"
  echo "[$dst]"
  process "$src" "$dst"
done

echo "done."
