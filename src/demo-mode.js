// Demo mode (DEMO_MODE=true): a public showcase filled with sample data that
// resets on a timer. Visitors stay signed in across resets.
import { hashPassword } from './auth.js';

export function demoConfig(env = process.env) {
  if (!/^(1|true|yes)$/i.test(env.DEMO_MODE || '')) return null;
  return { password: env.DEMO_PASSWORD || 'demo1234', resetMinutes: Math.max(5, Number(env.DEMO_RESET_MINUTES) || 60), lang: env.DEMO_LANG === 'en' ? 'en' : 'ar' };
}

/** Replaces the contents of `data` in place with `build()`, keeping the session secret and demo admin. */
export function resetData(data, build, demo) {
  const secret = data.meta?.secret;
  const admin = data.admin?.demo ? data.admin : null;
  const fresh = build();
  for (const k of Object.keys(data)) delete data[k];
  Object.assign(data, fresh);
  if (secret) data.meta.secret = secret;
  data.admin = admin || { ...hashPassword(demo.password), demo: true };
}

export const daysAgo = (n, h = 12) => { const d = new Date(Date.now() - n * 864e5); d.setUTCHours(h, 0, 0, 0); return d.toISOString(); };
