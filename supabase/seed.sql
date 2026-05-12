-- seed.sql
-- 초기 SKU 시드: 브랜드 5 × 액면가 3 = 15개
-- 참조: .omc/plans/b2c-giftcard-broker-mvp.md Section 8 Phase 2 step 17

insert into public.sku (brand, denomination, display_order) values
    ('롯데백화점',    50000,  100),
    ('롯데백화점',   100000,   99),
    ('롯데백화점',   300000,   98),
    ('현대백화점',    50000,   90),
    ('현대백화점',   100000,   89),
    ('현대백화점',   300000,   88),
    ('신세계백화점',  50000,   80),
    ('신세계백화점', 100000,   79),
    ('신세계백화점', 300000,   78),
    ('갤러리아백화점', 50000,  70),
    ('갤러리아백화점', 100000, 69),
    ('갤러리아백화점', 300000, 68),
    ('AK백화점',      50000,   60),
    ('AK백화점',     100000,   59),
    ('AK백화점',     300000,   58)
on conflict (brand, denomination) do nothing;
