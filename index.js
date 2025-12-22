const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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
    console.log("✅ MongoDB connected successfully!");
    const db = client.db("BookCourierDB");

    const BooksCollection = db.collection("Books");
    const OrdersCollection = db.collection("Orders");
    const LibrarianOrdersCollection = db.collection("Librarian-Orders");
    const InvoicesCollection = db.collection("Invoices");
    const WishlistCollection = db.collection("Wishlists");
    const ReviewsCollection = db.collection("Reviews");
    const UsersCollection = db.collection("Users");

    // ==========================
    // BOOKS - Complete CRUD
    // ==========================
    app.get("/books", async (req, res) => {
      try {
        const books = await BooksCollection.find({
          status: "Published",
        })
          .sort({ createdAt: -1 })
          .toArray();
        res.send(books);
      } catch {
        res.status(500).send({ message: "Failed to fetch books" });
      }
    });

    // ✅ LATEST BOOKS - Home page এর জন্য
    app.get("/books/latest", async (req, res) => {
      try {
        const latestBooks = await BooksCollection.find({ status: "Published" })
          .sort({ createdAt: -1 })
          .limit(4)
          .toArray();
        res.send(latestBooks);
      } catch {
        res.status(500).send({ message: "Failed to fetch latest books" });
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

    app.post("/books", async (req, res) => {
      try {
        const book = req.body;
        if (
          !book.bookName ||
          !book.author ||
          !book.price ||
          !book.librarianEmail
        )
          return res.status(400).send({ message: "Missing required fields" });

        const newBook = {
          ...book,
          price: Number(book.price),
          stock: Number(book.stock || 0),
          status: book.status || "Unpublished",
          createdAt: new Date(),
        };

        await BooksCollection.insertOne(newBook);
        res.status(201).send({ success: true });
      } catch (err) {
        res.status(500).send({ message: "Failed to add book" });
      }
    });

    app.get("/librarian/books/:email", async (req, res) => {
      try {
        const books = await BooksCollection.find({
          librarianEmail: req.params.email,
        })
          .sort({ createdAt: -1 })
          .toArray();
        res.send(books);
      } catch (err) {
        res.status(500).send({ message: "Failed to fetch books" });
      }
    });

    app.patch("/books/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const updatedData = req.body;
        if (!ObjectId.isValid(id))
          return res.status(400).send({ message: "Invalid book ID" });

        if (updatedData.price) updatedData.price = Number(updatedData.price);
        if (updatedData.stock) updatedData.stock = Number(updatedData.stock);

        const result = await BooksCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedData }
        );
        if (result.matchedCount === 0)
          return res.status(404).send({ message: "Book not found" });
        res.send({ success: true });
      } catch (err) {
        res.status(500).send({ message: "Failed to update book" });
      }
    });

    app.patch("/books/unpublish/:id", async (req, res) => {
      try {
        await BooksCollection.updateOne(
          { _id: new ObjectId(req.params.id) },
          { $set: { status: "Unpublished" } }
        );
        res.send({ success: true });
      } catch (err) {
        res.status(500).send({ message: "Failed to unpublish book" });
      }
    });

    app.get("/admin/books", async (req, res) => {
      try {
        const books = await BooksCollection.find()
          .sort({ createdAt: -1 })
          .toArray();
        res.send(books);
      } catch (err) {
        res.status(500).send({ message: "Failed to fetch books" });
      }
    });

    app.patch("/admin/books/:id", async (req, res) => {
      try {
        await BooksCollection.updateOne(
          { _id: new ObjectId(req.params.id) },
          { $set: { status: req.body.status } }
        );
        res.send({ success: true });
      } catch (err) {
        res.status(500).send({ message: "Failed to update book status" });
      }
    });

    // ✅ FIXED: LibrarianOrders delete করা হয়নি - History safe!
    app.delete("/admin/books/:id", async (req, res) => {
      try {
        const bookId = new ObjectId(req.params.id);
        await BooksCollection.deleteOne({ _id: bookId });
        await OrdersCollection.deleteMany({ bookId });
        // LibrarianOrdersCollection.deleteMany({ bookId }); // ✅ COMMENTED - History preserved
        res.send({ success: true });
      } catch (err) {
        res.status(500).send({ message: "Failed to delete book" });
      }
    });

    // ==========================
    // ORDERS - Complete
    // ==========================
    app.post("/orders", async (req, res) => {
      try {
        const order = req.body;
        if (
          !order.email ||
          !order.phone ||
          !order.address ||
          !order.bookId ||
          !order.quantity ||
          !order.totalPrice
        )
          return res.status(400).send({ message: "Missing required data" });

        let bookObjectId;
        try {
          bookObjectId = new ObjectId(order.bookId);
        } catch {
          return res.status(400).send({ message: "Invalid book ID" });
        }

        const book = await BooksCollection.findOne({ _id: bookObjectId });
        if (!book) return res.status(404).send({ message: "Book not found" });

        const newOrder = {
          ...order,
          bookId: bookObjectId,
          librarianEmail: book.librarianEmail,
          orderStatus: "pending",
          paymentStatus: "unpaid",
          createdAt: new Date(),
        };

        await OrdersCollection.insertOne(newOrder);
        await LibrarianOrdersCollection.insertOne(newOrder);

        res.status(201).send({ success: true });
      } catch (error) {
        console.error("Order error:", error);
        res.status(500).send({ message: "Failed to place order" });
      }
    });

    app.get("/orders/:email", async (req, res) => {
      try {
        const orders = await OrdersCollection.find({
          email: req.params.email,
        })
          .sort({ createdAt: -1 })
          .toArray();
        res.send(orders);
      } catch {
        res.status(500).send({ message: "Failed to fetch orders" });
      }
    });

    app.get("/orders/single/:id", async (req, res) => {
      try {
        const orderId = new ObjectId(req.params.id);
        const order = await OrdersCollection.findOne({ _id: orderId });
        if (!order) return res.status(404).send({ message: "Order not found" });
        res.send(order);
      } catch {
        res.status(500).send({ message: "Failed to fetch order" });
      }
    });

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

        await InvoicesCollection.insertOne({
          orderId: orderId,
          bookId: order.bookId,
          bookName: order.bookName,
          quantity: order.quantity,
          price: order.price,
          totalPrice: order.totalPrice,
          email: order.email,
          phone: order.phone,
          address: order.address,
          userName: order.userName,
          image: order.image || order.bookImg_URL,
          createdAt: new Date(),
        });

        res.send({ success: true });
      } catch (error) {
        console.error("Payment error:", error);
        res.status(500).send({ message: "Failed to process payment" });
      }
    });

    // ==========================
    // LIBRARIAN ORDERS - FIXED!
    // ==========================
    app.get("/librarian/orders/:email", async (req, res) => {
      try {
        const orders = await LibrarianOrdersCollection.aggregate([
          { $match: { librarianEmail: req.params.email } },
          {
            $lookup: {
              from: "Books",
              localField: "bookId",
              foreignField: "_id",
              as: "bookDetails",
            },
          },
          {
            $unwind: { path: "$bookDetails", preserveNullAndEmptyArrays: true },
          }, // ✅ FIXED
          {
            $project: {
              _id: 1,
              bookId: 1,
              bookName: {
                $ifNull: ["$bookDetails.bookName", "$bookName", "Deleted Book"],
              }, // ✅ FIXED
              bookImg_URL: {
                $ifNull: ["$bookDetails.bookImg_URL", "/placeholder.jpg"],
              }, // ✅ FIXED
              userName: 1,
              phone: 1,
              address: 1,
              quantity: 1,
              totalPrice: 1,
              orderStatus: 1,
              paymentStatus: 1,
              createdAt: 1,
            },
          },
        ]).toArray();

        res.send(orders);
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to fetch orders" });
      }
    });

    app.patch("/librarian/orders/status/:id", async (req, res) => {
      try {
        const { orderStatus } = req.body;
        const orderId = new ObjectId(req.params.id);

        await OrdersCollection.updateOne(
          { _id: orderId },
          { $set: { orderStatus } }
        );
        await LibrarianOrdersCollection.updateOne(
          { _id: orderId },
          { $set: { orderStatus } }
        );

        res.send({ success: true });
      } catch (err) {
        res.status(500).send({ message: "Failed to update order status" });
      }
    });

    // ==========================
    // INVOICES
    // ==========================
    app.get("/invoices/:email", async (req, res) => {
      try {
        const invoices = await InvoicesCollection.find({
          email: req.params.email,
        })
          .sort({ createdAt: -1 })
          .toArray();
        res.send(invoices);
      } catch {
        res.status(500).send({ message: "Failed to fetch invoices" });
      }
    });

    // ==========================
    // WISHLIST
    // ==========================
    app.post("/wishlist", async (req, res) => {
      try {
        const { email, bookId } = req.body;
        const bookObjectId = new ObjectId(bookId);

        const exists = await WishlistCollection.findOne({
          email,
          bookId: bookObjectId,
        });
        if (exists) return res.status(409).send({ message: "Already added" });

        await WishlistCollection.insertOne({
          email,
          bookId: bookObjectId,
          createdAt: new Date(),
        });
        res.send({ success: true });
      } catch (err) {
        res.status(500).send({ message: "Failed to add wishlist" });
      }
    });

    app.get("/wishlist/:email", async (req, res) => {
      try {
        const wishlist = await WishlistCollection.aggregate([
          { $match: { email: req.params.email } },
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
      } catch (err) {
        res.status(500).send({ message: "Failed to fetch wishlist" });
      }
    });

    app.delete("/wishlist/:id", async (req, res) => {
      try {
        const id = new ObjectId(req.params.id);
        await WishlistCollection.deleteOne({ _id: id });
        res.send({ success: true });
      } catch (err) {
        res.status(500).send({ message: "Failed to remove from wishlist" });
      }
    });

    // ==========================
    // REVIEWS - Complete
    // ==========================
    app.post("/reviews", async (req, res) => {
      try {
        const { bookId, email, rating, review } = req.body;
        let bookObjectId;

        try {
          bookObjectId = new ObjectId(bookId);
        } catch {
          return res.status(400).send({ message: "Invalid book ID" });
        }

        const ordered = await OrdersCollection.findOne({
          email,
          bookId: bookObjectId,
          paymentStatus: "paid",
        });
        if (!ordered)
          return res
            .status(403)
            .send({ message: "Order required to post review" });

        await ReviewsCollection.insertOne({
          bookId: bookObjectId,
          email,
          rating: Number(rating),
          review,
          createdAt: new Date(),
        });
        res.send({ success: true });
      } catch (err) {
        res.status(500).send({ message: "Failed to post review" });
      }
    });

    app.get("/reviews/:bookId", async (req, res) => {
      try {
        const bookObjectId = new ObjectId(req.params.bookId);
        const reviews = await ReviewsCollection.find({
          bookId: bookObjectId,
        })
          .sort({ createdAt: -1 })
          .toArray();
        res.send(reviews);
      } catch (err) {
        res.status(500).send({ message: "Failed to fetch reviews" });
      }
    });

    // ==========================
    // ADMIN - Users
    // ==========================
    app.get("/admin/users", async (req, res) => {
      try {
        const users = await UsersCollection.find()
          .sort({ createdAt: -1 })
          .toArray();
        res.send(users);
      } catch (err) {
        res.status(500).send({ message: "Failed to fetch users" });
      }
    });

    app.patch("/admin/users/:id", async (req, res) => {
      try {
        const userId = new ObjectId(req.params.id);
        const { role } = req.body;

        const result = await UsersCollection.updateOne(
          { _id: userId },
          { $set: { role: role, updatedAt: new Date() } }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "User not found" });
        }

        res.send({ success: true, role });
      } catch (err) {
        res.status(500).send({ message: "Failed to update role" });
      }
    });

    app.post("/auth/register", async (req, res) => {
      try {
        const { uid, displayName, email } = req.body;

        const exists = await UsersCollection.findOne({ uid });
        if (exists) {
          return res.status(409).send({ message: "User already exists" });
        }

        await UsersCollection.insertOne({
          uid,
          displayName: displayName || email.split("@")[0],
          email,
          role: "user",
          createdAt: new Date(),
          lastLoginAt: new Date(),
        });

        res.status(201).send({ success: true });
      } catch (err) {
        res.status(500).send({ message: "Failed to save user" });
      }
    });

    app.post("/auth/login", async (req, res) => {
      try {
        const { uid } = req.body;
        await UsersCollection.updateOne(
          { uid },
          { $set: { lastLoginAt: new Date() } }
        );
        res.send({ success: true });
      } catch (err) {
        res.status(500).send({ message: "Login track failed" });
      }
    });

    // ==========================
    // USER DASHBOARD STATS - REAL DATA
    // ==========================

    // User Stats - Monthly orders + totals
    app.get("/user/stats/:email", async (req, res) => {
      try {
        const orders = await OrdersCollection.aggregate([
          { $match: { email: req.params.email } },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: "%Y-%m",
                  date: "$createdAt",
                },
              },
              count: { $sum: 1 },
              totalPrice: { $sum: "$totalPrice" },
            },
          },
          { $sort: { _id: -1 } },
          { $limit: 6 },
        ]).toArray();

        const totalOrders = await OrdersCollection.countDocuments({
          email: req.params.email,
        });
        const totalPaid = await OrdersCollection.countDocuments({
          email: req.params.email,
          paymentStatus: "paid",
        });
        const totalPending = await OrdersCollection.countDocuments({
          email: req.params.email,
          orderStatus: "pending",
        });

        // Convert to chart format
        const monthlyOrders = orders.map((order) => ({
          month: order._id.slice(-2), // "01", "02"
          orders: order.count,
          revenue: Math.round(order.totalPrice),
        }));

        res.send({
          totalOrders,
          totalPaid,
          totalPending,
          totalCancelled: totalOrders - totalPaid - totalPending,
          monthlyOrders,
          avgRating: 4.5, // Mock - add reviews later
        });
      } catch (err) {
        console.error("User stats error:", err);
        res.status(500).send({ message: "Failed to fetch user stats" });
      }
    });

    // User Recent Orders (Table data)
    app.get("/user/recent-orders/:email", async (req, res) => {
      try {
        const recentOrders = await OrdersCollection.aggregate([
          { $match: { email: req.params.email } },
          { $sort: { createdAt: -1 } },
          { $limit: 5 },
          {
            $lookup: {
              from: "Books",
              localField: "bookId",
              foreignField: "_id",
              as: "bookDetails",
              pipeline: [{ $project: { bookName: 1, bookImg_URL: 1 } }],
            },
          },
          {
            $addFields: {
              bookName: { $arrayElemAt: ["$bookDetails.bookName", 0] },
              bookImg_URL: { $arrayElemAt: ["$bookDetails.bookImg_URL", 0] },
            },
          },
          {
            $project: {
              bookName: 1,
              bookImg_URL: 1,
              quantity: 1,
              totalPrice: 1,
              orderStatus: 1,
              paymentStatus: 1,
              createdAt: 1,
            },
          },
        ]).toArray();

        res.send(recentOrders);
      } catch (err) {
        console.error("Recent orders error:", err);
        res.status(500).send({ message: "Failed to fetch recent orders" });
      }
    });

    // Wishlist count (for stats card)
    app.get("/user/wishlist-count/:email", async (req, res) => {
      try {
        const count = await WishlistCollection.countDocuments({
          email: req.params.email,
        });
        res.send({ wishlistCount: count });
      } catch (err) {
        res.status(500).send({ message: "Failed to fetch wishlist" });
      }
    });

    // Admin Stats - REAL DATA
    app.get("/admin/stats", async (req, res) => {
      try {
        const [users, books, orders] = await Promise.all([
          UsersCollection.aggregate([
            { $group: { _id: "$role", count: { $sum: 1 } } },
          ]).toArray(),
          BooksCollection.countDocuments({ status: "Published" }),
          OrdersCollection.countDocuments(),
        ]);

        const userStats = users.reduce((acc, u) => {
          acc[u._id] = u.count;
          return acc;
        }, {});

        res.send({
          totalUsers: await UsersCollection.countDocuments(),
          totalBooks: books,
          totalOrders: orders,
          users: userStats,
          monthlyBooks: await BooksCollection.aggregate([
            {
              $group: {
                _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: -1 } },
            { $limit: 6 },
          ]).toArray(),
        });
      } catch (err) {
        res.status(500).send({ message: "Stats error" });
      }
    });

    // Librarian Stats - REAL DATA
    app.get("/librarian/stats/:email", async (req, res) => {
      try {
        const [books, orders] = await Promise.all([
          BooksCollection.countDocuments({ librarianEmail: req.params.email }),
          LibrarianOrdersCollection.aggregate([
            { $match: { librarianEmail: req.params.email } },
            { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
          ]).toArray(),
        ]);

        const orderStats = orders.reduce(
          (acc, o) => {
            acc[o._id] = o.count;
            return acc;
          },
          { pending: 0, confirmed: 0, cancelled: 0 }
        );

        res.send({
          totalBooks: books,
          totalOrders: await LibrarianOrdersCollection.countDocuments({
            librarianEmail: req.params.email,
          }),
          pending: orderStats.pending || 0,
          confirmed: orderStats.confirmed || 0,
          cancelled: orderStats.cancelled || 0,
        });
      } catch (err) {
        res.status(500).send({ message: "Stats error" });
      }
    });

    // User Stats - REAL DATA
    app.get("/user/stats/:email", async (req, res) => {
      try {
        const orders = await OrdersCollection.aggregate([
          { $match: { email: req.params.email } },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: -1 } },
          { $limit: 6 },
        ]).toArray();

        res.send({
          totalOrders: await OrdersCollection.countDocuments({
            email: req.params.email,
          }),
          monthlyOrders: orders,
        });
      } catch (err) {
        res.status(500).send({ message: "Stats error" });
      }
    });

    console.log("✅ All routes loaded successfully!");
  } catch (error) {
    console.error("❌ Server error:", error);
  }
}

run().catch(console.dir);

app.get("/", (req, res) => res.send("🚀 BookCourier Server Running!"));
app.listen(port, () => console.log(`🌐 Server running on port ${port}`));
