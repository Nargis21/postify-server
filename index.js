const express = require('express');
const cors = require('cors');
require('dotenv').config()
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express()
const port = process.env.PORT || 5000;

app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.1faki4g.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization
    if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
    const token = authHeader.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded
        next()
    });
}

async function run() {
    try {
        await client.connect()
        console.log('DB Connected!')
        const postCollection = client.db('postify').collection('posts')
        const orderCollection = client.db('postify').collection('orders')
        const userCollection = client.db('postify').collection('users')
        const reviewCollection = client.db('postify').collection('reviews')
        const paymentCollection = client.db('postify').collection('payments')


        app.put('/user/:email', async (req, res) => {
            const email = req.params.email
            const user = req.body
            const filter = { email: email }
            const options = { upsert: true };
            const updateDoc = {
                $set: user
            }
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' })

            res.send({ result, token })

        })
        // app.put('/user/update/:email', async (req, res) => {
        //     const email = req.params.email
        //     const user = req.body
        //     const filter = { email: email }
        //     const options = { upsert: true };
        //     const updateDoc = {
        //         $set: user
        //     }
        //     const result = await userCollection.updateOne(filter, updateDoc, options);
        //     res.send(result)

        // })

        app.post('/posts', verifyJWT, async (req, res) => {
            const post = req.body
            const result = await postCollection.insertOne(post)
            res.send(result)
        })

        app.patch('/posts/like/:id', async (req, res) => {
            const { id } = req.params;
            const { liked } = req.body;
            const filter = { _id: ObjectId(id) };

            // Fetch the existing post to get the current reaction value
            const existingPost = await postCollection.findOne(filter);

            // Calculate the updated reaction value
            const updatedReaction = liked
                ? existingPost.reaction + 1
                : existingPost.reaction - 1;

            // Prepare the update query
            const updateQuery = {
                $set: { reaction: updatedReaction }
            };

            // Update the post with the new reaction value
            const updatedPost = await postCollection.updateOne(filter, updateQuery);

            res.send(updatedPost);
        });
        app.patch('/posts/comment/:id', async (req, res) => {
            const { id } = req.params;
            const { comment } = req.body;
            const filter = { _id: ObjectId(id) };

            // Fetch the existing post to get the current reaction value
            const existingPost = await postCollection.findOne(filter);

            // Add the new comment to the existing comments array
            const updatedComment = existingPost.comment.push(comment)

            // Prepare the update query
            const updateQuery = {
                $set: { comment: existingPost.comment }
            };

            // Update the post with the new reaction value
            const updatedPost = await postCollection.updateOne(filter, updateQuery);

            res.send(updatedPost);
        });

        app.get('/posts/popular', async (req, res) => {
            const posts = await postCollection
                .find()
                .sort({ reaction: -1 }) // Sort the posts in descending order of reaction
                .limit(3) // Limit the result to 3 posts
                .toArray();

            res.send(posts);
        })

        app.get('/posts/:id', async (req, res) => {
            const { id } = req.params;
            const result = await postCollection.findOne({ _id: ObjectId(id) })
            res.send(result)
        })

        app.get('/posts', async (req, res) => {
            const posts = await postCollection.find().toArray()
            res.send(posts)
        })
    }
    finally {
    }
}

run().catch(console.dir)

app.get('/', (req, res) => {
    res.send('Hello From Postify!')
})

app.listen(port, () => {
    console.log('Postify, Listening to port:', port)
})



