import assert from 'node:assert'
import sql from 'sql-template-tag'
import sqleasy, { type Driver } from '../index.ts'
import { describe, test } from 'node:test'

type Test = {
  id: number
  name: string
}

describe('sqleasy driver', async () => {
  test('should handle basic operations', async () => {
    const db = await connect()
    const id = await db.run(sql`INSERT INTO test (name) VALUES (${'Alice'})`)

    assert.strictEqual(typeof id, 'number', 'run should return a number')

    // Test get (single row)
    const row = await db.get<Test>(
      sql`SELECT * FROM test WHERE name = ${'Alice'}`,
    )
    assert.ok(row, 'get should return a row')
    assert.strictEqual(row.name, 'Alice', 'row name should be Alice')

    // Test all (multiple rows)
    await db.exec(sql`INSERT INTO test (name) VALUES (${'Bob'})`)
    const rows = await db.all(sql`SELECT * FROM test`)

    assert.strictEqual(rows.length, 2, 'all should return two rows')

    // Test exec (no result)
    await db.exec(sql`UPDATE test SET name = 'Charlie' WHERE name = 'Alice'`)
    const updated = await db.get<Test>(sql`SELECT * FROM test WHERE id = ${id}`)

    assert.strictEqual(updated?.name, 'Charlie', 'exec should update the row')
  })

  test('should close the database connection', async () => {
    const db = await connect()

    await db.run(sql`INSERT INTO test (name) VALUES (${'Test'})`)
    await db.close()

    // After closing, further queries should fail
    await assert.rejects(
      () => db.run(sql`INSERT INTO test (name) VALUES (${'ShouldFail'})`),
      /SQLITE_MISUSE/,
      'run after close should throw SQLITE_CLOSED error',
    )
  })
})

async function connect(): Promise<Driver> {
  const connect = await sqleasy(
    ':memory:',
    /* sql */ `
      CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT);
    `,
  )

  return connect()
}
