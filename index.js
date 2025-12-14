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

        // 🔍 SEARCH BY BOOK NAME (case-insensitive)
        if (search) {
          query.bookName = { $regex: search, $options: "i" };
        }

        // 💰 SORT BY PRICE NUMERICALLY
        let sortOption = {};
        if (sort === "asc") {
          sortOption.price = 1;
        } else if (sort === "desc") {
          sortOption.price = -1;
        }

        // If some price values are strings, convert them to numbers in aggregation
        const books = await BooksCollection.aggregate([
          { $match: query },
          {
            $addFields: {
              numericPrice: { $toDouble: "$price" }, // convert string price to number
            },
          },
          { $sort: sortOption.price ? { numericPrice: sortOption.price } : {} },
        ]).toArray();

        res.send(books);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to fetch books" });
      }
    });

    // GET latest books
    app.get("/books", async (req, res) => {
      try {
        const { latest, limit } = req.query;
        let query = {};
        let options = {};

        if (latest === "true") {
          options.sort = { createdAt: -1 }; // newest first
          options.limit = parseInt(limit) || 6;
        }

        const books = await BooksCollection.find(query)
          .sort(options.sort || {})
          .limit(options.limit || 0)
          .toArray();

        res.send(books);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to fetch books" });
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
