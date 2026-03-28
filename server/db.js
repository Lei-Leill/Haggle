import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// Helper function to parse and execute SQL queries against Supabase
const db = {
  prepare: (sqlQuery) => {
    return {
      get: async (...params) => executeQuery(sqlQuery, params, 'get'),
      all: async (...params) => executeQuery(sqlQuery, params, 'all'),
      run: async (...params) => executeQuery(sqlQuery, params, 'run'),
    }
  },
}

async function executeQuery(sqlQuery, params, type) {
  const sql = sqlQuery.trim()
  const lower = sql.toLowerCase()

  try {
    // SELECT queries
    if (lower.includes('select')) {
      return await handleSelect(sql, params, type)
    }

    // INSERT queries
    if (lower.includes('insert')) {
      return await handleInsert(sql, params)
    }

    // UPDATE queries
    if (lower.includes('update')) {
      return await handleUpdate(sql, params)
    }

    // DELETE queries
    if (lower.includes('delete')) {
      return await handleDelete(sql, params)
    }

    throw new Error(`Unsupported query: ${sql}`)
  } catch (error) {
    console.error('DB Query Error:', sql, params, error)
    throw error
  }
}

async function handleSelect(sql, params, type) {
  const tableMatch = sql.match(/FROM\s+(\w+)/i)
  const table = tableMatch?.[1]
  if (!table) throw new Error('Cannot determine table from SELECT query')

  let query = supabase.from(table).select('*')

  // Parse WHERE conditions
  const whereMatch = sql.match(/WHERE\s+(.+?)(?:ORDER BY|$)/i)
  if (whereMatch) {
    const whereClauses = whereMatch[1].trim()
    let paramIdx = 0

    // Parse conditions like "email = ?" or "id = ? AND user_id = ?"
    const conditions = whereClauses.split(/\s+AND\s+/i)
    for (const condition of conditions) {
      if (condition.includes('IS NULL')) {
        const col = condition.split('IS NULL')[0].trim()
        query = query.is(col, null)
      } else if (condition.includes('= ?')) {
        const col = condition.split('=')[0].trim()
        query = query.eq(col, params[paramIdx++])
      } else if (condition.includes('IN (')) {
        const col = condition.split('IN')[0].trim()
        query = query.in(col, params[paramIdx++])
      }
    }
  }

  // Parse ORDER BY
  const orderMatch = sql.match(/ORDER BY\s+(\w+)\s+(ASC|DESC)?/i)
  if (orderMatch) {
    const col = orderMatch[1]
    const ascending = orderMatch[2]?.toUpperCase() !== 'DESC'
    query = query.order(col, { ascending })
  }

  const { data, error } = await query

  if (error) throw error

  if (type === 'get') {
    return data?.[0] || null
  }
  return data || []
}

async function handleInsert(sql, params) {
  const tableMatch = sql.match(/INSERT INTO\s+(\w+)/i)
  const table = tableMatch?.[1]
  if (!table) throw new Error('Cannot determine table from INSERT query')

  const colMatch = sql.match(/\(([^)]+)\)\s*VALUES/)
  const columns = colMatch?.[1]?.split(',').map(c => c.trim()) || []

  const row = {}
  columns.forEach((col, i) => {
    row[col] = params[i]
  })

  const { data, error } = await supabase.from(table).insert([row]).select()

  if (error) throw error

  return { lastInsertRowid: data?.[0]?.id }
}

async function handleUpdate(sql, params) {
  const tableMatch = sql.match(/UPDATE\s+(\w+)/i)
  const table = tableMatch?.[1]
  if (!table) throw new Error('Cannot determine table from UPDATE query')

  const setMatch = sql.match(/SET\s+(.+?)\s+WHERE/i)
  if (!setMatch) throw new Error('Cannot parse UPDATE SET clause')

  const setParts = setMatch[1].split(',').map(s => s.trim())
  const row = {}
  let paramIdx = 0

  for (const part of setParts) {
    const [col] = part.split('=').map(s => s.trim())
    if (col === 'updated_at') {
      row[col] = new Date().toISOString()
    } else {
      row[col] = params[paramIdx++]
    }
  }

  // Parse WHERE clause - usually just "id = ?"
  const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\?/)
  const whereCol = whereMatch?.[1] || 'id'
  const whereValue = params[paramIdx]

  const { error } = await supabase.from(table).update(row).eq(whereCol, whereValue)

  if (error) throw error

  return { changes: 1 }
}

async function handleDelete(sql, params) {
  const tableMatch = sql.match(/DELETE FROM\s+(\w+)/i)
  const table = tableMatch?.[1]
  if (!table) throw new Error('Cannot determine table from DELETE query')

  // Parse WHERE clause - could be "id = ? AND user_id = ?" or just "id = ?"
  const whereMatch = sql.match(/WHERE\s+(.+)$/i)
  const whereClause = whereMatch?.[1] || ''

  let query = supabase.from(table).delete()
  let paramIdx = 0

  // Handle multiple conditions
  const conditions = whereClause.split(/\s+AND\s+/i)
  for (const condition of conditions) {
    if (condition.includes('=')) {
      const col = condition.split('=')[0].trim()
      query = query.eq(col, params[paramIdx++])
    }
  }

  const { data, error } = await query

  if (error) throw error

  return { changes: 1 }
}

export default db
