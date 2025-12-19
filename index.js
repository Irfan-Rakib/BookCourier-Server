// // ==========================
// // Import dependencies
// // ==========================
// const express = require("express");
// const cors = require("cors");
// require("dotenv").config();
// const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// // ==========================
// // Initialize app
// // ==========================
// const app = express();
// const port = process.env.PORT || 3000;

// // ==========================
// // Middleware
// // ==========================
// app.use(cors());
// app.use(express.json());

// // ==========================
// // MongoDB connection
// // ==========================
// const uri = `mongodb+srv://${process.env.DB_user}:${process.env.DB_pass}@cluster0.kvdsln8.mongodb.net/?appName=Cluster0`;

// const client = new MongoClient(uri, {
//   serverApi: {
//     version: ServerApiVersion.v1,
//     strict: true,
//     deprecationErrors: true,
//   },
// });

// // ==========================
// // Main async function
// // ==========================
// async function run() {
//   try {
//     await client.connect();
//     console.log("MongoDB connected successfully!");
//     const db = client.db("BookCourierDB");

//     const BooksCollection = db.collection("Books");
//     const OrdersCollection = db.collection("Orders");
//     const LibrarianOrdersCollection = db.collection("Librarian-Orders");
//     const WishlistCollection = db.collection("Wishlists");
//     const ReviewsCollection = db.collection("Reviews");
//     const UsersCollection = db.collection("Users");

//     // ==========================
//     // BOOKS
//     // ==========================
//     app.get("/books", async (req, res) => {
//       try {
//         const books = await BooksCollection.find({
//           status: "Published",
//         }).toArray();
//         res.send(books);
//       } catch (err) {
//         res.status(500).send({ message: "Failed to fetch books" });
//       }
//     });

//     app.get("/books/:id", async (req, res) => {
//       try {
//         const { id } = req.params;
//         if (!ObjectId.isValid(id))
//           return res.status(400).send({ message: "Invalid book ID" });

//         const book = await BooksCollection.findOne({ _id: new ObjectId(id) });
//         if (!book) return res.status(404).send({ message: "Book not found" });

//         res.send(book);
//       } catch (err) {
//         res.status(500).send({ message: "Failed to fetch book" });
//       }
//     });

//     app.post("/books", async (req, res) => {
//       try {
//         const book = req.body;
//         if (!book.bookName || !book.author || !book.price || !book.email)
//           return res.status(400).send({ message: "Missing required fields" });

//         const newBook = {
//           ...book,
//           price: Number(book.price),
//           stock: Number(book.stock || 0),
//           status: book.status || "Unpublished",
//           createdAt: new Date(),
//         };

//         await BooksCollection.insertOne(newBook);
//         res.status(201).send({ success: true });
//       } catch (err) {
//         res.status(500).send({ message: "Failed to add book" });
//       }
//     });

//     app.get("/librarian/books/:email", async (req, res) => {
//       try {
//         const books = await BooksCollection.find({
//           librarianEmail: req.params.email,
//         }).toArray();
//         res.send(books);
//       } catch (err) {
//         res.status(500).send({ message: "Failed to fetch books" });
//       }
//     });

//     app.patch("/books/:id", async (req, res) => {
//       const { id } = req.params;
//       const updatedData = req.body;
//       if (!ObjectId.isValid(id))
//         return res.status(400).send({ message: "Invalid book ID" });

//       if (updatedData.price) updatedData.price = Number(updatedData.price);
//       if (updatedData.stock) updatedData.stock = Number(updatedData.stock);

//       try {
//         const result = await BooksCollection.updateOne(
//           { _id: new ObjectId(id) },
//           { $set: updatedData }
//         );
//         if (result.matchedCount === 0)
//           return res.status(404).send({ message: "Book not found" });
//         res.send({ success: true, message: "Book updated successfully" });
//       } catch (err) {
//         res.status(500).send({ message: "Failed to update book" });
//       }
//     });

//     app.patch("/books/unpublish/:id", async (req, res) => {
//       try {
//         await BooksCollection.updateOne(
//           { _id: new ObjectId(req.params.id) },
//           { $set: { status: "Unpublished" } }
//         );
//         res.send({ success: true });
//       } catch (err) {
//         res.status(500).send({ message: "Failed to unpublish book" });
//       }
//     });

//     // ==========================
//     // ORDERS
//     // ==========================
//     app.post("/orders", async (req, res) => {
//       try {
//         const order = req.body;
//         if (!order.email || !order.phone || !order.address || !order.bookId)
//           return res.status(400).send({ message: "Missing data" });

//         const book = await BooksCollection.findOne({
//           _id: new ObjectId(order.bookId),
//         });
//         if (!book) return res.status(404).send({ message: "Book not found" });

//         const newOrder = {
//           ...order,
//           bookId: new ObjectId(order.bookId),
//           librarianEmail: book.librarianEmail,
//           orderStatus: "pending",
//           paymentStatus: "unpaid",
//           createdAt: new Date(),
//         };

//         // Insert in both collections
//         await OrdersCollection.insertOne(newOrder);
//         await LibrarianOrdersCollection.insertOne(newOrder);

//         res.status(201).send({ success: true });
//       } catch (err) {
//         res.status(500).send({ message: "Failed to place order" });
//       }
//     });

//     // ==========================
//     // Librarian Orders
//     // ==========================
//     app.get("/librarian/orders/:email", async (req, res) => {
//       try {
//         const orders = await LibrarianOrdersCollection.aggregate([
//           { $match: { librarianEmail: req.params.email } },
//           {
//             $lookup: {
//               from: "Books",
//               localField: "bookId",
//               foreignField: "_id",
//               as: "bookDetails",
//             },
//           },
//           { $unwind: "$bookDetails" },
//           {
//             $project: {
//               _id: 1,
//               bookId: 1,
//               bookName: "$bookDetails.bookName",
//               userName: 1,
//               phone: 1,
//               address: 1,
//               orderStatus: 1,
//               paymentStatus: 1,
//               createdAt: 1,
//             },
//           },
//         ]).toArray();

//         res.send(orders);
//       } catch (err) {
//         console.error(err);
//         res.status(500).send({ message: "Failed to fetch orders" });
//       }
//     });

//     app.patch("/orders/cancel/:id", async (req, res) => {
//       try {
//         await LibrarianOrdersCollection.updateOne(
//           { _id: new ObjectId(req.params.id) },
//           { $set: { orderStatus: "cancelled" } }
//         );
//         res.send({ success: true });
//       } catch (err) {
//         res.status(500).send({ message: "Failed to cancel order" });
//       }
//     });

//     app.patch("/orders/status/:id", async (req, res) => {
//       try {
//         const { orderStatus } = req.body;
//         await LibrarianOrdersCollection.updateOne(
//           { _id: new ObjectId(req.params.id) },
//           { $set: { orderStatus } }
//         );
//         res.send({ success: true });
//       } catch (err) {
//         res.status(500).send({ message: "Failed to update order status" });
//       }
//     });

//     app.patch("/orders/pay/:id", async (req, res) => {
//       try {
//         await LibrarianOrdersCollection.updateOne(
//           { _id: new ObjectId(req.params.id) },
//           { $set: { paymentStatus: "paid", orderStatus: "confirmed" } }
//         );
//         res.send({ success: true });
//       } catch (err) {
//         res.status(500).send({ message: "Failed to update payment" });
//       }
//     });

//     // ==========================
//     // WISHLIST
//     // ==========================
//     app.post("/wishlist", async (req, res) => {
//       try {
//         const { email, bookId } = req.body;
//         const exists = await WishlistCollection.findOne({
//           email,
//           bookId: new ObjectId(bookId),
//         });
//         if (exists) return res.status(409).send({ message: "Already added" });

//         await WishlistCollection.insertOne({
//           email,
//           bookId: new ObjectId(bookId),
//           createdAt: new Date(),
//         });
//         res.send({ success: true });
//       } catch (err) {
//         res.status(500).send({ message: "Failed to add wishlist" });
//       }
//     });

//     app.get("/wishlist/:email", async (req, res) => {
//       try {
//         const wishlist = await WishlistCollection.aggregate([
//           { $match: { email: req.params.email } },
//           {
//             $lookup: {
//               from: "Books",
//               localField: "bookId",
//               foreignField: "_id",
//               as: "book",
//             },
//           },
//           { $unwind: "$book" },
//         ]).toArray();
//         res.send(wishlist);
//       } catch (err) {
//         res.status(500).send({ message: "Failed to fetch wishlist" });
//       }
//     });

//     // ==========================
//     // REVIEWS
//     // ==========================
//     app.post("/reviews", async (req, res) => {
//       try {
//         const { bookId, email, rating, review } = req.body;
//         const ordered = await OrdersCollection.findOne({ email, bookId });
//         if (!ordered)
//           return res.status(403).send({ message: "Order required" });

//         await ReviewsCollection.insertOne({
//           bookId,
//           email,
//           rating,
//           review,
//           createdAt: new Date(),
//         });
//         res.send({ success: true });
//       } catch (err) {
//         res.status(500).send({ message: "Failed to post review" });
//       }
//     });

//     app.get("/reviews/:bookId", async (req, res) => {
//       try {
//         const reviews = await ReviewsCollection.find({
//           bookId: req.params.bookId,
//         }).toArray();
//         res.send(reviews);
//       } catch (err) {
//         res.status(500).send({ message: "Failed to fetch reviews" });
//       }
//     });

//     // ==========================
//     // ADMIN
//     // ==========================
//     app.get("/admin/users", async (req, res) => {
//       try {
//         const users = await UsersCollection.find().toArray();
//         res.send(users);
//       } catch (err) {
//         res.status(500).send({ message: "Failed to fetch users" });
//       }
//     });

//     app.patch("/admin/users/:id", async (req, res) => {
//       try {
//         await UsersCollection.updateOne(
//           { _id: new ObjectId(req.params.id) },
//           { $set: { role: req.body.role } }
//         );
//         res.send({ success: true });
//       } catch (err) {
//         res.status(500).send({ message: "Failed to update role" });
//       }
//     });

//     app.get("/admin/books", async (req, res) => {
//       try {
//         const books = await BooksCollection.find().toArray();
//         res.send(books);
//       } catch (err) {
//         res.status(500).send({ message: "Failed to fetch books" });
//       }
//     });

//     app.patch("/admin/books/:id", async (req, res) => {
//       try {
//         await BooksCollection.updateOne(
//           { _id: new ObjectId(req.params.id) },
//           { $set: { status: req.body.status } }
//         );
//         res.send({ success: true });
//       } catch (err) {
//         res.status(500).send({ message: "Failed to update book status" });
//       }
//     });

//     app.delete("/admin/books/:id", async (req, res) => {
//       try {
//         const bookId = new ObjectId(req.params.id);
//         await BooksCollection.deleteOne({ _id: bookId });
//         await OrdersCollection.deleteMany({ bookId });
//         await LibrarianOrdersCollection.deleteMany({ bookId });
//         res.send({ success: true });
//       } catch (err) {
//         res.status(500).send({ message: "Failed to delete book" });
//       }
//     });
//   } catch (error) {
//     console.error(error);
//   }
// }

// // ==========================
// // Run server
// // ==========================
// run();
// app.get("/", (req, res) => res.send("BookCourier Server Running"));
// app.listen(port, () => console.log(`Server running on port ${port}`));

// ==========================
// Import dependencies
// ==========================
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// ==========================
// Initialize app
// ==========================
const app = express();
const port = process.env.PORT || 3000;

// ==========================
// Middleware
// ==========================
app.use(cors());
app.use(express.json());

// ==========================
// MongoDB connection
// ==========================
const uri = `mongodb+srv://${process.env.DB_user}:${process.env.DB_pass}@cluster0.kvdsln8.mongodb.net/?appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// ==========================
// Main async function
// ==========================
async function run() {
  try {
    await client.connect();
    console.log("MongoDB connected successfully!");
    const db = client.db("BookCourierDB");

    const BooksCollection = db.collection("Books");
    const OrdersCollection = db.collection("Orders");
    const LibrarianOrdersCollection = db.collection("Librarian-Orders");
    const InvoicesCollection = db.collection("Invoices");

    // ==========================
    // BOOKS
    // ==========================
    app.get("/books", async (req, res) => {
      try {
        const books = await BooksCollection.find({
          status: "Published",
        }).toArray();
        res.send(books);
      } catch {
        res.status(500).send({ message: "Failed to fetch books" });
      }
    });

    app.get("/books/:id", async (req, res) => {
      try {
        const { id } = req.params;
        if (!ObjectId.isValid(id))
          return res.status(400).send({ message: "Invalid book ID" });
        const book = await BooksCollection.findOne({ _id: new ObjectId(id) });
        if (!book) return res.status(404).send({ message: "Book not found" });
        res.send(book);
      } catch {
        res.status(500).send({ message: "Failed to fetch book" });
      }
    });

    // ==========================
    // ORDERS
    // ==========================
    app.post("/orders", async (req, res) => {
      try {
        const order = req.body;
        if (!order.email || !order.phone || !order.address || !order.bookId)
          return res.status(400).send({ message: "Missing data" });

        const book = await BooksCollection.findOne({
          _id: new ObjectId(order.bookId),
        });
        if (!book) return res.status(404).send({ message: "Book not found" });

        const newOrder = {
          ...order,
          bookId: new ObjectId(order.bookId),
          librarianEmail: book.librarianEmail,
          orderStatus: "pending",
          paymentStatus: "unpaid",
          createdAt: new Date(),
        };

        await OrdersCollection.insertOne(newOrder);
        await LibrarianOrdersCollection.insertOne(newOrder);

        res.status(201).send({ success: true });
      } catch {
        res.status(500).send({ message: "Failed to place order" });
      }
    });

    // Cancel Order
    app.patch("/orders/cancel/:id", async (req, res) => {
      try {
        const orderId = new ObjectId(req.params.id);
        await OrdersCollection.updateOne(
          { _id: orderId },
          { $set: { orderStatus: "cancelled" } }
        );
        await LibrarianOrdersCollection.updateOne(
          { _id: orderId },
          { $set: { orderStatus: "cancelled" } }
        );
        res.send({ success: true });
      } catch {
        res.status(500).send({ message: "Failed to cancel order" });
      }
    });

    // Pay Order
    app.patch("/orders/pay/:id", async (req, res) => {
      try {
        const orderId = new ObjectId(req.params.id);
        const order = await OrdersCollection.findOne({ _id: orderId });
        if (!order) return res.status(404).send({ message: "Order not found" });

        await OrdersCollection.updateOne(
          { _id: orderId },
          { $set: { paymentStatus: "paid", orderStatus: "confirmed" } }
        );
        await LibrarianOrdersCollection.updateOne(
          { _id: orderId },
          { $set: { paymentStatus: "paid", orderStatus: "confirmed" } }
        );

        // Create invoice
        await InvoicesCollection.insertOne({
          bookId: order.bookId,
          bookName: order.bookName,
          email: order.email,
          price: order.price,
          createdAt: new Date(),
        });

        res.send({ success: true });
      } catch {
        res.status(500).send({ message: "Failed to update payment" });
      }
    });

    // Get user orders
    app.get("/orders/:email", async (req, res) => {
      try {
        const orders = await OrdersCollection.find({
          email: req.params.email,
        }).toArray();
        res.send(orders);
      } catch {
        res.status(500).send({ message: "Failed to fetch orders" });
      }
    });

    // Get invoices
    app.get("/invoices/:email", async (req, res) => {
      try {
        const invoices = await InvoicesCollection.find({
          email: req.params.email,
        }).toArray();
        res.send(invoices);
      } catch {
        res.status(500).send({ message: "Failed to fetch invoices" });
      }
    });
  } catch (error) {
    console.error(error);
  }
}

// ==========================
// Run server
// ==========================
run();
app.get("/", (req, res) => res.send("BookCourier Server Running"));
app.listen(port, () => console.log(`Server running on port ${port}`));
