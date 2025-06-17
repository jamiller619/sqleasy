import assert from 'node:assert'
import sql from 'sql-template-tag'
import sqleasy from '../index.ts'
import { describe, test } from 'node:test'

type Test = {
  id: number
  name: string
}

describe('sqleasy driver', () => {
  test('should handle basic operations', async () => {
    // Use in-memory database for testing
    const connect = await sqleasy(
      ':memory:',
      /* sql */ ` CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT);`,
    )

    const db = connect()

    // Test run (insert)
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
})
