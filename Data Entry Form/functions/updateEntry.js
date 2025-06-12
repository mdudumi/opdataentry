import { connect } from "@netlify/neon";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const data = JSON.parse(event.body);
  const {
    id,
    entry_date,
    pad,
    well,
    tubing_pressure,
    casing_pressure,
    speed,
    fluid_level,
    torque,
    oil_pressure,
    oil_level,
    frequency,
    tank_volume,
    free_water,
    bsw_tank,
    tank_temp,
    water_diluent,
    diesel_propane,
    chmc,
  } = data;

  const client = connect({
    connectionString: process.env.NETLIFY_DATABASE_URL_UNPOOLED,
  });

  // update all the fields
  await client.query(
    `
    UPDATE south1_entries
       SET entry_date      = $1,
           pad             = $2,
           well            = $3,
           tubing_pressure = $4,
           casing_pressure = $5,
           speed           = $6,
           fluid_level     = $7,
           torque          = $8,
           oil_pressure    = $9,
           oil_level       = $10,
           frequency       = $11,
           tank_volume     = $12,
           free_water      = $13,
           bsw_tank        = $14,
           tank_temp       = $15,
           water_diluent   = $16,
           diesel_propane  = $17,
           chmc            = $18
     WHERE id = $19
    `,
    [
      entry_date,
      pad,
      well,
      tubing_pressure,
      casing_pressure,
      speed,
      fluid_level,
      torque,
      oil_pressure,
      oil_level,
      frequency,
      tank_volume,
      free_water,
      bsw_tank,
      tank_temp,
      water_diluent,
      diesel_propane,
      chmc,
      id,
    ]
  );

  return {
    statusCode: 200,
    body: "Updated",
  };
};
