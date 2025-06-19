# sqleasy

A minimal, type-friendly async wrapper for SQLite and `sqlite3` for Node.js/TypeScript projects.

## Features

- Async API for SQLite
- Includes a streaming interface for large result sets
- TypeScript support with generics for query results
- Implements explicit resource management (i.e. `await using` syntax)
- Schema initialization support
- Supports two APIs for safe SQL queries, tagged template literals (ala `sql-template-tag`) and string queries with parameter substitution

## Installation

> Don't forget to install `sqlite3`!

```
npm install jamiller619/sqleasy sqlite3
```

## Usage

Create a `db.ts` file:

```ts
import sqleasy from 'sqleasy'

// Initialize the database (optionally with a schema)
const connect = await sqleasy(
  '/path/to/my.db',
  `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
  );
`,
)

// export default connect()
await using db = connect()
```

Now you can reference your db from anywhere in your project:

```ts
import sql from 'sql-template-tag'
import db from './db.ts'

type User = { id: number; name: string }

// Insert a user using query strings and parameter substitution
const userId = await db.run(`INSERT INTO users (name) VALUES (?)`, 'Alice')

// Query a single user with sql tagged template literals
const user = await db.one<User>(
  sql`SELECT * FROM users WHERE name = ${'Alice'}`,
)

// Query all users
const users = await db.many<User>('SELECT * FROM users')

// Stream users
const userStream = db.stream<User>('SELECT * FROM users')

for (const user of userStream) {
  console.log(user.name)
}
```

## API

### `sqleasy(fileName: string, schema?: string): Promise<() => Driver>`

Initializes the SQLite database. Optionally runs a schema SQL string. Returns a function that creates a `Driver` instance.

### `Driver`

A class that wraps a SQLite database connection and provides async methods:

- `exec(sql: string): Promise<void>` — Executes a SQL statement without returning a result.
- `run(sql: Sql | string, ...values: any[]): Promise<number>` — Executes a SQL statement and resolves with the last inserted row ID.
- `one<R>(sql: Sql | string, ...values: any[]): Promise<R | undefined>` — Fetches a single row from the database.
- `many<R>(sql: Sql | string, ...values: any[]): Promise<R[]>` — Fetches all rows from the database.
- `stream<R>(sql: Sql | string, ...values: any[]): DatabaseStream<R>` — Returns a stream for the given SQL query.
- `close(): Promise<void>` — Closes the underlying database.
  Can be used with Explicit Resource Management syntax, i.e. `using`.

## TypeScript Support

- All methods are fully typed.
- Use generics to specify the result row type for `one`,
  `many` and `stream`.

## License

MIT
