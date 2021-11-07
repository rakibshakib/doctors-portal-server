const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;
const { MongoClient } = require('mongodb');

require('dotenv').config();
// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_CLUSER}/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function run() {
    try {
        await client.connect();
        const DoctorsPortal = client.db("DoctorsPortal");
        const appoimentData = DoctorsPortal.collection("appoimentData");
        const userData = DoctorsPortal.collection("user_data");
        // create a document to insert
        console.log("connented to mongoDB");

        // post appoimentData to database 
        app.post("/appoinment-data", async (req, res) => {
            const data = req.body;
            const result = await appoimentData.insertOne(data)
            res.json(result)
        })
        // get appoinments data 
        app.get("/appoinmets-all-data", async (req, res) => {
            const email = req.query.email;
            const date = new Date(req.query.date).toLocaleDateString();
            const query = { email: email, date: date }
            const cursor = appoimentData.find(query)
            const appoinments = await cursor.toArray();
            res.json(appoinments);
        })
        // post user data from ui 
        app.post('/users-data', async (req, res) => {
            const user = req.body;
            const result = await userData.insertOne(user)
            res.json(result)
        })
        // update data for google login user 
        app.put('/users-data', async (req, res) => {
            const user = req.body;
            const filterUser = { email: user.email };
            const options = { upsert: true };
            const updateUser = {
                $set: user
            }
            const result = await userData.updateOne(filterUser, updateUser, options)
            res.json(result)
        })
    } finally {
        //   await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello Doctor Portal Server !');
});

app.listen(port, () => {
    console.log(`listening at http://localhost:${port}`);
});