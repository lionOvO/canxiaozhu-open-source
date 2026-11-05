// Older order APIs stored ISO text; Prisma stores DateTime as milliseconds.
// Normalize both at query time, without rewriting historical business records.
export function sqliteTimeMillis(column: 'createdAt' | 'o.createdAt') {
  return `(CASE WHEN typeof(${column}) IN ('integer', 'real') THEN ${column} ELSE CAST(ROUND((julianday(${column}) - 2440587.5) * 86400000) AS INTEGER) END)`
}
