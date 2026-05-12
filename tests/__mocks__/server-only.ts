// Stub for `server-only` package — Next.js blocks importing this in client bundles,
// but Vitest (node env) treats it as a hard error because the package has no JS exports.
// This empty module satisfies the import in test runtime.
export {};
