import { canonicalPreviewUrl } from './config/staging';

const canonical = canonicalPreviewUrl(location.href, import.meta.env.VITE_SUPABASE_URL ?? '');
if (canonical) location.replace(canonical);
else void import('./main');
