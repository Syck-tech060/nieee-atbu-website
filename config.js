// EDIT THESE TWO PUBLIC VALUES (Supabase > Project Settings > API).
// Publishable/anon keys are safe in the browser ONLY because RLS is enabled.
// Never paste the service_role / secret key here.

/* ================================================================
   NIEEE ATBU — config.js
================================================================ */
'use strict';

window.NIEEE_CONFIG = {
  SUPABASE_URL: "https://qkoicdyewvvjqmmnrrws.supabase.co/",
  SUPABASE_KEY: "sb_publishable_3EXhJn13EMo5nfssCl1KnA_3bfA1uy8",
  CONTACT_EMAIL: "nieee.atbu.2027@gmail.com",
  CONTACT_PHONE: "+2349041173168"
};

// Initialize Supabase client using window.NIEEE_CONFIG
const db = window.supabase.createClient(
  window.NIEEE_CONFIG.SUPABASE_URL, 
  window.NIEEE_CONFIG.SUPABASE_KEY
);

/* ──────────────────────────────────────────────────────────────
   DATABASE HELPER FUNCTIONS (Required by app.js)
────────────────────────────────────────────────────────────── */

async function dbSelect(table, options = {}) {
  let query = db.from(table).select(options.select || '*');

  if (options.eq) {
    query = query.eq(options.eq[0], options.eq[1]);
  }
  if (options.eqMany && Array.isArray(options.eqMany)) {
    options.eqMany.forEach(([col, val]) => {
      query = query.eq(col, val);
    });
  }
  if (options.order) {
    const [column, rule] = options.order;
    query = query.order(column, rule || { ascending: true });
  }
  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.single) {
    const { data, error } = await query.single();
    if (error && error.code !== 'PGRST116') {
      console.error(`Error selecting single from ${table}:`, error.message);
    }
    return data;
  } else {
    const { data, error } = await query;
    if (error) {
      console.error(`Error selecting from ${table}:`, error.message);
    }
    return data;
  }
}

async function dbInsert(table, payload) {
  const { data, error } = await db.from(table).insert([payload]).select();
  if (error) throw error;
  return data ? data[0] : null;
}

async function dbUpdate(table, id, payload) {
  const { data, error } = await db.from(table).update(payload).eq('id', id).select();
  if (error) throw error;
  return data ? data[0] : null;
}

async function dbDelete(table, id) {
  const { error } = await db.from(table).delete().eq('id', id);
  if (error) throw error;
  return true;
}

async function uploadFile(bucket, file, path) {
  const { data, error } = await db.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: true
  });
  if (error) throw error;
  return data.path;
}

function getImageUrl(bucket, path) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const { data } = db.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
