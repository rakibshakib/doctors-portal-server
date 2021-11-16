const express = require("express");
const app = express();
const admin = require("firebase-admin");
const cors = require("cors");
const port = process.env.PORT || 5000;
const { MongoClient } = require("mongodb");
const ObjectId = require("mongodb").ObjectId;
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// firebase token varificatiion
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
// require("./doctors-portal-rs-firebase-adminsdk.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_CLUSER}/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith("Bearer ")) {
    const token = req.headers.authorization.split(" ")[1];
    try {
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.decodedEmail = decodedUser.email;
    } catch {}
  }
  next();
}

async function run() {
  try {
    await client.connect();
    const DoctorsPortal = client.db("DoctorsPortal");
    const appoimentData = DoctorsPortal.collection("appoimentData");
    const userData = DoctorsPortal.collection("user_data");
    // create a document to insert

    // post appoimentData to database
    app.post("/appoinment-data", async (req, res) => {
      const data = req.body;
      const result = await appoimentData.insertOne(data);
      res.json(result);
    });
    // get appoinments data
    app.get("/appoinmets-all-data", verifyToken, async (req, res) => {
      const email = req.query.email;
      const date = req.query.date;
      const query = { email: email, date: date };
      const cursor = appoimentData.find(query);
      const appoinments = await cursor.toArray();
      res.json(appoinments);
    });
    // get apponment booking single info
    app.get("/appoinment/:id", async (req, res) => {
      const id = req.params.id;

      const query = { _id: ObjectId(id) };
      const result = await appoimentData.findOne(query);
      res.json(result);
    });
    // post user data from ui
    app.post("/users-data", async (req, res) => {
      const user = req.body;
      const result = await userData.insertOne(user);
      res.json(result);
    });
    // update data for google login user
    app.put("/users-data", async (req, res) => {
      const user = req.body;
      const filterUser = { email: user.email };
      const options = { upsert: true };
      const updateUser = { $set: user };
      const result = await userData.updateOne(filterUser, updateUser, options);
      res.json(result);
    });

    // set admin
    app.put("/users-data/admin", verifyToken, async (req, res) => {
      const user = req.body;
      // const token = req.headers.authorization;
      const requester = req.decodedEmail;
      if (requester) {
        const requesterAccount = await userData.findOne({ email: requester });
        if (requesterAccount.role === "admin") {
          const filter = { email: user.email };
          const updateDoc = { $set: { role: "admin" } };
          const result = await userData.updateOne(filter, updateDoc);
          res.json(result);
        }
      } else {
        res.status(403).json({
          message: "You dont have permission to make this user admin",
        });
      }
    });
    // get user data as a admin
    app.get("/users-data/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await userData.findOne(query);
      let isAdmin = false;
      if (user?.role === "admin") {
        isAdmin = true;
      }
      res.json({ admin: isAdmin });
    });

    // update appoinemetn payment 
    app.put('/appoinment/:id', async(req, res)=> {
        const id = req.params.id;
        const payment = req.body;
        const filter = {_id: ObjectId(id)}
        const updateDoc = {
          $set:{
            payment: payment
          }
        }
        const result = await appoimentData.updateOne(filter, updateDoc)
        res.json(result)
    })

    // stripe payment method for card
    app.post("/create-payment-intent", async (req, res) => {
      // const { items } = req.body;
      const paymentInfo = req.body ;
      const amount = paymentInfo.price *100;
      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: [
          "card"
        ],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
  } finally {
    //   await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello Doctor Portal Server !");
});

app.listen(port, () => {
  console.log(` 😁 listening at http://localhost:${port}`);
});
