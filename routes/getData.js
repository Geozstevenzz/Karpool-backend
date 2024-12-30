const router = require('express').Router();
const pool = require("../db");

// router.get("/api/getAllTrips", async(req, res)=>{
//     try{
//         const allTrips = await pool.query("SELECT tripName AS name, ST_X(startLoc::geometry) AS lat, ST_Y(startLoc::geometry) AS long  FROM trips");
//         res.json(allTrips.rows);

//     }catch(err){
//         console.error(err.message);
//         res.status(500).send("server error");
//     }
// });

// router.get("/api/getNearest/:lat/:lon", async(req, res)=>{
//     try{
//         const {lat} = req.params;
//         const {lon} = req.params;
//         const allTrips = await pool.query("SELECT tripName AS name, ST_X(startLoc::geometry) AS lat, ST_Y(startLoc::geometry) AS long, ST_Distance(trips.startLoc, ST_SetSRID(ST_Point($1,$2),4326)) AS distance  FROM trips ORDER BY distance LIMIT 2", [lat, lon]);
//         res.json(allTrips.rows);

//     }catch(err){
//         console.error(err.message);
//         res.status(500).send("server error");
//     }
// });

router.post("/api/createTrip", async (req, res) => {
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
  });

router.post("/api/getTrips", async (req, res) => {
  try {
    const { locationMarker, destinationMarker, time, date } = req.body;

    const { latitude: startLat, longitude: startLon } = locationMarker;
    const { latitude: destLat, longitude: destLon } = destinationMarker;

    // Define constants
    const distanceThreshold = 5 * 1000; // 5 km in meters
    const timeOffset = '1 hour'; // +/- 1 hour
    const averageSpeed = 40; // Average driving speed in km/h (adjust as needed)

    const query = `
      SELECT 
        trips.tripid,
        trips.driverid,
        trips.vehicleid,
        trips.numberofpassengers,
        trips.numberofstops,
        trips.overallrating,
        trips.price,
        trips.triptime,
        trips.tripdate,
        trips.totalseats,
        ST_X(trips.startlocation) AS startlatitude,
        ST_Y(trips.startlocation) AS startlongitude,
        ST_X(trips.destinationlocation) AS destinationlatitude,
        ST_Y(trips.destinationlocation) AS destinationlongitude,
        ST_DistanceSphere(startlocation, ST_SetSRID(ST_Point($1, $2), 4326)) AS distance,
        users.username,
        users.profile_photo,
        vehicles.vehiclename,
        vehicles.vehiclecolor,
        vehicles.vehiclenumber,
        vehicles.vehicleaverage
      FROM trips
      JOIN users ON trips.driverid = users.userid
      JOIN vehicles ON trips.vehicleid = vehicles.vehicleid
      WHERE 
        ST_DistanceSphere(startlocation, ST_SetSRID(ST_Point($1, $2), 4326)) <= $3
        AND ST_DistanceSphere(destinationlocation, ST_SetSRID(ST_Point($4, $5), 4326)) <= $3
        AND trips.tripdate = $6
        AND trips.triptime BETWEEN ($7::time - $8::interval) AND ($7::time + $8::interval)
      LIMIT 5;
    `;

    const values = [
      startLon,
      startLat,
      distanceThreshold,
      destLon,
      destLat,
      date,
      time,
      timeOffset,
    ];

    const result = await pool.query(query, values);

    const formattedTrips = result.rows.map(row => {
      const distanceInKm = row.distance / 1000; // Convert distance to kilometers
      const estimatedTimeInHours = distanceInKm / averageSpeed;
      const estimatedTimeInMinutes = Math.round(estimatedTimeInHours * 60);

      return {
        tripid: row.tripid,
        driverid: row.driverid,
        vehicleid: row.vehicleid,
        numberofpassengers: row.numberofpassengers,
        numberofstops: row.numberofstops,
        overallrating: row.overallrating,
        price: row.price,
        triptime: row.triptime,
        tripdate: row.tripdate,
        totalseats: row.totalseats,
        startlocation: {
          latitude: row.startlatitude,
          longitude: row.startlongitude,
        },
        destinationlocation: {
          latitude: row.destinationlatitude,
          longitude: row.destinationlongitude,
        },
        distance: distanceInKm.toFixed(2), // Distance in km rounded to 2 decimal places
        estimatedTime: `${estimatedTimeInMinutes} minutes`, // Estimated time in minutes
        username: row.username,
        profile_photo: row.profile_photo,
        vehiclename: row.vehiclename,
        vehiclecolor: row.vehiclecolor,
        vehiclenumber: row.vehiclenumber,
        vehicleaverage: row.vehicleaverage,
      };
    });

    res.status(200).json(formattedTrips);
  } catch (error) {
    console.error('Error fetching trips:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports= router;