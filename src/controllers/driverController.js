const pool = require("../utils/db");


const createTripHandler = async (req, res) => {
    console.log("Finally Inside router ")
    const {
        dates,
        destinationMarker,
        locationMarker,
        price,
        seats,
        stops,
        time,
        userID,
        vehicleID,
    } = req.body;
  
    if (!dates || !Array.isArray(dates) || dates.length === 0) {
        return res.status(400).json({ error: 'Invalid or missing dates array' });
    }
  
    // Start a transaction
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
    
        // Insert a trip for each date
        for (const tripDate of dates) {
            const query = `
            INSERT INTO trips (
                driverid, vehicleid, numberofpassengers, numberofstops,
                startlocation, destinationlocation, price, triptime,
                tripdate, totalseats, overallrating
            ) VALUES (
                $1, $2, 0, $3, 
                ST_SetSRID(ST_MakePoint($4, $5), 4326),
                ST_SetSRID(ST_MakePoint($6, $7), 4326),
                $8, $9, $10, $11, 5
            )
            `;
    
            const values = [
            userID,
            vehicleID,
            parseInt(stops, 10),
            locationMarker.longitude,
            locationMarker.latitude,
            destinationMarker.longitude,
            destinationMarker.latitude,
            parseInt(price, 10),
            time,
            tripDate,
            parseInt(seats, 10),
            ];
    
            await client.query(query, values);
        }
    
        await client.query('COMMIT');
        res.status(201).json({ message: 'Trips created successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating trips:', error);
        res.status(500).json({ error: 'An error occurred while creating trips' });
    } finally {
        client.release();
    }
}


module.exports = { createTripHandler };