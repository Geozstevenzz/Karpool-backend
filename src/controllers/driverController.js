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
};

const registerVehicle = async (req, res) => {
    try {
        const { userID, vehicleName, vehicleColor, vehicleNumber, vehicleAverage } = req.body;

        // Check if the user exists
        const userCheck = await pool.query("SELECT * FROM Users WHERE UserID = $1", [userID]);
        if (userCheck.rowCount === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if the user is a driver
        const driverCheck = await pool.query("SELECT DriverID FROM Drivers WHERE UserID = $1", [userID]);
        let driverID;

        if (driverCheck.rowCount === 0) {
            // If user is not a driver, insert them into Drivers table
            const newDriver = await pool.query(
                "INSERT INTO Drivers (UserID) VALUES ($1) RETURNING DriverID",
                [userID]
            );
            await pool.query(
                `UPDATE Users SET IsDriver = TRUE WHERE UserID = $1`,
                [userID]
            );
            driverID = newDriver.rows[0].driverid;
        } else {
            driverID = driverCheck.rows[0].driverid;
        }

        // Register the vehicle
        const vehicleInsert = await pool.query(
            "INSERT INTO Vehicles (VehicleName, VehicleColor, VehicleNumber, VehicleAverage, DriverID) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [vehicleName, vehicleColor, vehicleNumber, vehicleAverage, driverID]
        );

        res.status(201).json({ message: "Vehicle registered successfully", vehicle: vehicleInsert.rows[0] });

    } catch (error) {
        console.error("Error registering vehicle:", error);
        res.status(500).json({ message: "Server error" });
    }
};

const acceptPassengerReq = async (req, res) => {
    try {
        const { requestId, tripId } = req.body;

        const client = await pool.connect();
        try {
            await client.query("BEGIN");

            // Update request status to ACCEPTED
            await client.query(
                `UPDATE TripRequests 
                 SET Status = 'ACCEPTED' 
                 WHERE RequestID = $1 AND TripID = $2`,
                [requestId, tripId]
            );

            // Insert into TripPassengers table
            await client.query(
                `INSERT INTO TripPassengers (TripID, PassengerID) 
                 VALUES ($2, (SELECT PassengerID FROM TripRequests WHERE RequestID = $1))`,
                [requestId, tripId]
            );

            await client.query("COMMIT");
            client.release();

            res.json({ message: "Passenger request accepted" });

        } catch (err) {
            await client.query("ROLLBACK");
            client.release();
            console.error("Error accepting passenger request:", err);
            res.status(500).json({ message: "Server error" });
        }
    } catch (err) {
        console.error("Database connection error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

const rejectPassengerReq = async (req, res) => {
    try {
        const { requestId, tripId } = req.body;

        const result = await pool.query(
            `UPDATE TripRequests 
            SET Status = 'REJECTED' 
            WHERE RequestID = $1 AND TripID = $2`,
            [requestId, tripId]
        );

        if (result.rowCount > 0) {
            res.json({ message: "Passenger request rejected" });
        } else {
            res.status(404).json({ message: "Request not found" });
        }

    } catch (err) {
        console.error("Error rejecting passenger request:", err);
        res.status(500).json({ message: "Server error" });
    }
};

//router.post("/trips/:tripId/complete",
const tripCompleted = async (req, res) => {
    try {
        const userId = req.user; 
        console.log(userId)
        const { tripId } = req.params; // tripId from URL

        // Check if the user is the driver of the trip
        const driverCheck = await pool.query(
            `SELECT TripID FROM Trips WHERE TripID = $1 AND DriverID = 
             (SELECT DriverID FROM Drivers WHERE UserID = $2)`,
            [tripId, userId]
        );

        if (driverCheck.rows.length === 0) {
            return res.status(403).json({ message: "Only the driver can complete this trip" });
        }

        // Update trip status to 'completed'
        await pool.query(
            `UPDATE Trips SET Status = 'completed' WHERE TripID = $1`,
            [tripId]
        );

        res.json({ message: "Trip marked as completed successfully" });

    } catch (err) {
        console.error("Error completing trip:", err);
        res.status(500).json({ message: "Server error" });
    }
};


module.exports = { createTripHandler, registerVehicle, acceptPassengerReq, rejectPassengerReq, tripCompleted };