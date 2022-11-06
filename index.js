const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require('jsonwebtoken')
const app = express();
const port = process.env.PORT || 5000

// midelware
app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
    res.send('Genius car server is running...')
})

app.listen(port, () => {
    console.log(`Genius server port: ${port}`)
})


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.wpflsxi.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT (req, res, next) {
    const authHeader = req.headers.authorization
    if(!authHeader) {
        return res.status(401).send({message: 'unauthorize access'})
    }
    const token = authHeader.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function(error, decoded){
        if(error) {
            return res.status(401).send({ message: "unauthorize access" });
        }
        req.decoded = decoded
        next()
    })
}

async function run () {
    try{
        const servicesCollection = client.db("GeniusCar").collection("services");
        const ordersCollection = client.db("GeniusCar").collection('Orders');

        app.get('/services', async(req, res) => {
            const query = {}
            const cursor = servicesCollection.find(query)
            const services = await cursor.toArray();
            res.send(services)
        })
        
        app.get('/service/:id', async(req, res)=> {
            const id = req.params.id;
            const query =  {_id: ObjectId(id)} ;
            const service = await servicesCollection.findOne(query)
            res.send(service)
        })

        //jwt 
        app.post("/jwt", (req, res) => {
          const user = req.body;
          const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: "1d",
          });
          res.send({ token });
        });

        // Orders api
        app.get('/orders', verifyJWT, async(req, res) => {
            const docoded = req.docoded
            if(docoded.email !== req.query.email) {
                res.status(401).send({ message: "unauthorize access" });
            }
            let query = {}
            if(req.query.email) {
                 query = {
                    email : req.query.email
                }
            }
            const cursor = ordersCollection.find(query)
            const order = await cursor.toArray()
            res.send(order)
        })

        app.post('/orders', async(req, res) => {
            const order = req.body;
            const result = await ordersCollection.insertOne(order)
            res.send(result)
            console.log(result)
        })

        app.patch('/orders/:id', async(req, res) => {
            const id = req.params.id;
            const status = req.body.status;
            const query = {_id: ObjectId(id)}
            const updateDoc = {
                $set : {
                    status : status
                }
            }
            const result = await ordersCollection.updateOne(query, updateDoc)
            res.send(result)
        })

        app.delete('/orders/:id', async(req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)}
            const result = await ordersCollection.deleteOne(query);
            res.send(result)
        })
    }
    finally{

    }
}

run().catch(e => console.log(e))