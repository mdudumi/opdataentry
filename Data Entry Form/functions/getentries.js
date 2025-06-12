import { connect } from "@netlify/neon";

export const handler = async () => {
  // use the unpooled URL so each invocation gets its own socket
  const client = connect({
    connectionString: process.env.NETLIFY_DATABASE_URL_UNPOOLED,
  });
  // fetch all rows, newest first
  const { rows } = await client.query(
    `SELECT * FROM south1_entries ORDER BY entry_date DESC;`
  );
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rows),
  };
};
