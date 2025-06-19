import assert from 'node:assert'
import sql from 'sql-template-tag'
import sqleasy, { type Driver } from '../src/index.ts'
import { describe, test } from 'node:test'

type Test = {
  id: number
  name: string
}

describe('sqleasy driver', async () => {
  test('should handle basic operations', async () => {
    const db = await connect()
    const id = await db.run(/* sql */ `
      INSERT INTO test (name) VALUES ('Alice')
    `)

    assert.strictEqual(typeof id, 'number', 'run should return a number')

    // Test get (single row)
    const row = await db.one<Test>(/* sql */ `
      SELECT * FROM test WHERE name = 'Alice'
    `)

    assert.ok(row, 'get should return a row')
    assert.strictEqual(row.name, 'Alice', 'row name should be Alice')

    // Test all (multiple rows)
    await db.exec(/* sql */ `INSERT INTO test (name) VALUES ('Bob')`)
    const rows = await db.many<Test>(sql`SELECT * FROM test`)

    assert.strictEqual(rows.length, 2, 'all should return two rows')

    // Test exec (no result)
    await db.exec(/* sql */ `
      UPDATE test SET name = 'Charlie' WHERE name = 'Alice'
    `)

    const updated = await db.one<Test>(sql`SELECT * FROM test WHERE id = ${id}`)

    assert.strictEqual(updated?.name, 'Charlie', 'exec should update the row')
  })

  test('should close the database connection', async () => {
    const db = await connect()

    await db.run(/* sql */ `
      INSERT INTO test (name) VALUES ('Test')
    `)

    await db.close()

    // After closing, further queries should fail
    await assert.rejects(
      () =>
        db.run(/* sql */ `
          INSERT INTO test (name) VALUES ('ShouldFail')
        `),
      /SQLITE_MISUSE/,
      'run after close should throw SQLITE_CLOSED error',
    )
  })

  test('should work with both sql template tags and string queries and params', async () => {
    const db = await connect()

    // Using sql template tag
    const id1 = await db.run(sql`INSERT INTO test (name) VALUES (${'Alice'})`)
    assert.strictEqual(
      typeof id1,
      'number',
      'run with sql tag should return a number',
    )

    // Using string query
    const id2 = await db.run(
      /* sql */ `INSERT INTO test (name) VALUES (?)`,
      'Bob',
    )
    assert.strictEqual(
      typeof id2,
      'number',
      'run with string query should return a number',
    )

    // Verify both rows exist
    const rows = await db.many<Test>(/* sql */ `SELECT * FROM test ORDER BY id`)
    assert.strictEqual(rows.length, 2, 'both rows should be inserted')
  })

  test('should stream query results', async () => {
    const db = await connect()
    await db.run(sql`INSERT INTO test (name) VALUES (${'Alice'}), (${'Bob'})`)

    const rows: Test[] = []
    const stream = db.stream<Test>(sql`SELECT * FROM test ORDER BY id`)

    for await (const row of stream) {
      rows.push(row)
    }

    assert.strictEqual(rows.length, 2, 'stream should yield two rows')
    assert.deepStrictEqual(
      rows.map((r) => r.name),
      ['Alice', 'Bob'],
      'streamed names should match inserted values',
    )
  })

  test('should return the number of processed rows', async () => {
    const db = await connect()

    for (let i = 0; i < 200; i += 1) {
      await db.run(sql`INSERT INTO test (name) VALUES (${'Bob' + i})`)
    }

    const count = await db.run(sql`SELECT COUNT(*) FROM test`)

    assert.strictEqual(
      count,
      200,
      'should return the number of inserted rows (200)',
    )

    const stream = db.stream<Test>(sql`SELECT * FROM test`)

    let s = 0
    for await (const _ of stream) {
      s += 1

      if (s >= 50) {
        stream.destroy()

        break
      }
    }

    assert.strictEqual(stream.getProcessedRowCount(), s)
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
