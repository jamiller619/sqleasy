# sqleasy

A minimal, type-friendly async wrapper for SQLite3 using `sql-template-tag` and `sqlite3` for Node.js/TypeScript projects.

## Features

- Async API for SQLite
- TypeScript support with generics for query results
- Schema initialization support
- Uses tagged template literals for safe SQL queries

## Installation

> Don't forget to install the `sqlite3` and `sql-template-tag` dependencies!

```
npm install jamiller619/sqleasy sqlite3 sql-template-tag
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

export default connect()
```

Now you can reference your db from anywhere in your project:

```ts
import sql from 'sql-template-tag'
import db from './db.ts'

type User = { id: number; name: string }

// Insert a user
const userId = await db.run(sql`INSERT INTO users (name) VALUES (${'Alice'})`)

// Query a single user
const user = await db.get<User>(
  sql`SELECT * FROM users WHERE name = ${'Alice'}`,
)

// Query all users
const users = await db.all<User>(sql`SELECT * FROM users`)
```

## API

### `sqleasy(fileName: string, schema?: string): Promise<() => Driver>`

Initializes the SQLite database. Optionally runs a schema SQL string. Returns a function that creates a `Driver` instance.

### `Driver`

A class that wraps a SQLite database connection and provides async methods:

- `run(sql: Sql): Promise<number>` — Executes a SQL statement and resolves with the last inserted row ID.
- `exec(sql: Sql): Promise<void>` — Executes a SQL statement without returning a result.
- `get<R>(sql: Sql): Promise<R | undefined>` — Fetches a single row from the database.
- `all<R>(sql: Sql): Promise<R[]>` — Fetches all rows from the database.

## TypeScript Support

- All methods are fully typed.
- Use generics to specify the result row type for `get` and `all`.

## License

MIT
