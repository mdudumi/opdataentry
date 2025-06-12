import { connect } from "@netlify/neon";

export const handler = async (event) => {
  console.log("🏃‍♂️ updateEntry invoked:", event.httpMethod);
  console.log("raw body:", event.body);

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Only POST allowed" };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch (err) {
    return { statusCode: 400, body: "Invalid JSON: " + err.message };
  }
  console.log("parsed payload:", data);

  // Make sure we have an ID
  const id = parseInt(data.id, 10);
  if (!id) {
    return { statusCode: 400, body: "Missing or invalid id: " + String(data.id) };
  }

  // List all your columns in the exact order you want to bind them:
  const columns = [
    "entry_date","pad","well","tubing_pressure","casing_pressure","speed",
    "fluid_level","torque","oil_pressure","oil_level","frequency","tank_volume",
    "free_water","bsw_tank","tank_temp","water_diluent","diesel_propane","chmc"
  ];

  // Build the SET clause dynamically:
  const setClause = columns
    .map((col, idx) => `${col} = $${idx + 1}`)
    .join(", ");

  const sql = `
    UPDATE south1_entries
       SET ${setClause}
     WHERE id = $${columns.length + 1}
  `;

  // Collect your values in the same order
  const values = columns.map((col) => data[col]);
  values.push(id);

  console.log("SQL:", sql.trim());
  console.log("VALUES:", values);

  try {
    const client = connect({
      connectionString: process.env.NETLIFY_DATABASE_URL_UNPOOLED,
    });

    const result = await client.query(sql, values);
    console.log("✅ Query result:", result);

    return {
      statusCode: 200,
      body: "Updated " + result.rowCount + " row(s)",
    };
  } catch (err) {
    console.error("🔥 DB Error:", err);
    return {
      statusCode: 500,
      body: "DB Error: " + err.message,
    };
  }
};
