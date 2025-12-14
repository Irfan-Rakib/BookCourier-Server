const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();

const port = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const uri = `mongodb+srv://${process.env.DB_user}:${process.env.DB_pass}@cluster0.kvdsln8.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    console.log("MongoDB connected");

    const db = client.db("BookCourierDB");
    const BooksCollection = db.collection("Books");

    /* ================= BOOK ROUTES ================= */

    // GET ALL BOOKS (Search & Sort)
    app.get("/books", async (req, res) => {
      try {
        const { search, sort } = req.query;

        let query = {};

        // 🔍 SEARCH BY BOOK NAME
        if (search) {
          query.bookName = { $regex: search, $options: "i" };
        }

        let sortOption = {};

        // 💰 SORT BY PRICE
        if (sort === "asc") {
          sortOption.price = 1;
        } else if (sort === "desc") {
          sortOption.price = -1;
        }

        const books = await BooksCollection.find(query)
          .sort(sortOption)
          .toArray();

        res.send(books);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch books" });
      }
    });

    // GET SINGLE BOOK
    app.get("/books/:id", async (req, res) => {
      try {
        const id = req.params.id;

        // Prevent crash on invalid ObjectId
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: "Invalid book ID" });
        }

        const book = await BooksCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!book) {
          return res.status(404).send({ message: "Book not found" });
        }

        res.send(book);
      } catch (err) {
        res.status(500).send({ message: "Failed to fetch book" });
      }
    });
  } catch (error) {
    console.error(error);
  }
}
run();

app.get("/", (req, res) => {
  res.send("BookCourier Server Running");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
