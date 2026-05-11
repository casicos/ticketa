# db tests

See `.omc/plans/b2c-giftcard-broker-mvp.md` Section 10.

## pgTAP RLS Matrix

`rls-matrix.sql` is a placeholder skeleton for Phase 7 expansion.

### Running pgTAP tests (future milestone)

Prerequisites:

- Supabase CLI installed: `brew install supabase/tap/supabase`
- pgTAP extension enabled on the target database

```bash
# Start local Supabase (includes pgTAP)
supabase start

# Run the RLS matrix test file
supabase db test --db-url "postgresql://postgres:postgres@localhost:54322/postgres" \
  tests/db/rls-matrix.sql

# Or using pg_prove directly (requires pgTAP CLI tools)
pg_prove --dbname=postgres --host=localhost --port=54322 --username=postgres \
  tests/db/rls-matrix.sql
```

### Test structure (planned)

Each table in the RLS policy matrix will be tested against:

- Anonymous (unauthenticated) access — expect denied
- Authenticated user — own-row access only
- Seller role — listings read/write scoped to own records
- Agent role — order access scoped to own orders
- Admin role — full access across all rows

Activate and expand `rls-matrix.sql` when pgTAP milestone is reached.
