const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();

const port = process.env.PORT || 3000;

// Middleware
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
    const OrdersCollection = db.collection("Orders");
    const WishlistCollection = db.collection("Wishlists");
    const ReviewsCollection = db.collection("Reviews");

    /* ================= BOOKS ================= */

    // Get all books (with search & sort)
    app.get("/books", async (req, res) => {
      try {
        const { search, sort } = req.query;

        let query = {};
        if (search) {
          query.bookName = { $regex: search, $options: "i" };
        }

        let sortOption = {};
        if (sort === "asc") sortOption.price = 1;
        else if (sort === "desc") sortOption.price = -1;

        const books = await BooksCollection.find(query)
          .sort(sortOption)
          .toArray();

        res.send(books);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to fetch books" });
      }
    });

    // Get single book by ID
    app.get("/books/:id", async (req, res) => {
      const { id } = req.params;

      if (!ObjectId.isValid(id))
        return res.status(400).send({ message: "Invalid book id" });

      const book = await BooksCollection.findOne({ _id: new ObjectId(id) });

      if (!book) return res.status(404).send({ message: "Book not found" });

      res.send(book);
    });

    /* ================= ORDERS ================= */

    // Place an order
    app.post("/orders", async (req, res) => {
      const order = req.body;

      if (!order.phone || !order.address)
        return res.status(400).send({ message: "Phone & address required" });

      const newOrder = {
        ...order,
        orderStatus: "pending",
        paymentStatus: "unpaid",
        createdAt: new Date(),
      };

      const result = await OrdersCollection.insertOne(newOrder);

      res.status(201).send({
        success: true,
        orderId: result.insertedId,
      });
    });

    // Get all orders of a user
    app.get("/orders/:email", async (req, res) => {
      const { email } = req.params;
      const orders = await OrdersCollection.find({ email }).toArray();
      res.send(orders);
    });

    // Cancel an order
    app.patch("/orders/cancel/:id", async (req, res) => {
      const { id } = req.params;

      if (!ObjectId.isValid(id))
        return res.status(400).send({ message: "Invalid order ID" });

      await OrdersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { orderStatus: "cancelled" } }
      );

      res.send({ success: true, message: "Order cancelled" });
    });

    /* ================= WISHLIST ================= */

    // Add to wishlist
    app.post("/wishlist", async (req, res) => {
      const { email, bookId } = req.body;

      if (!email || !bookId)
        return res.status(400).send({ message: "Missing data" });

      const exists = await WishlistCollection.findOne({ email, bookId });

      if (exists)
        return res.status(409).send({ message: "Already in wishlist" });

      await WishlistCollection.insertOne({
        email,
        bookId,
        createdAt: new Date(),
      });

      res.send({ success: true });
    });

    // Get wishlist of a user
    app.get("/wishlist/:email", async (req, res) => {
      const { email } = req.params;

      const wishlist = await WishlistCollection.aggregate([
        { $match: { email } },
        {
          $lookup: {
            from: "Books",
            localField: "bookId",
            foreignField: "_id",
            as: "book",
          },
        },
        { $unwind: "$book" },
      ]).toArray();

      res.send(wishlist);
    });

    /* ================= INVOICES ================= */

    // Get all paid orders for invoices
    app.get("/invoices/:email", async (req, res) => {
      const { email } = req.params;
      const invoices = await OrdersCollection.find({
        email,
        paymentStatus: "paid",
      }).toArray();
      res.send(invoices);
    });

    /* ================= REVIEWS ================= */

    // Post review (only if user ordered)
    app.post("/reviews", async (req, res) => {
      const { bookId, email, rating, review } = req.body;

      const ordered = await OrdersCollection.findOne({ email, bookId });
      if (!ordered)
        return res
          .status(403)
          .send({ message: "You must order this book to review" });

      await ReviewsCollection.insertOne({
        bookId,
        email,
        rating,
        review,
        createdAt: new Date(),
      });

      res.send({ success: true });
    });

    // Get reviews for a book
    app.get("/reviews/:bookId", async (req, res) => {
      const { bookId } = req.params;
      const reviews = await ReviewsCollection.find({ bookId }).toArray();
      res.send(reviews);
    });

    app.get("/orders/single/:id", async (req, res) => {
      const { id } = req.params;
      if (!ObjectId.isValid(id))
        return res.status(400).send({ message: "Invalid order ID" });

      const order = await OrdersCollection.findOne({ _id: new ObjectId(id) });
      if (!order) return res.status(404).send({ message: "Order not found" });

      res.send(order);
    });

    app.patch("/orders/pay/:id", async (req, res) => {
      const { id } = req.params;
      if (!ObjectId.isValid(id))
        return res.status(400).send({ message: "Invalid order ID" });

      await OrdersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { paymentStatus: "paid" } }
      );

      res.send({ success: true, message: "Payment completed" });
    });

    console.log("Server ready 🚀");
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
