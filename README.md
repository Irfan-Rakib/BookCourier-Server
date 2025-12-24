# [📚 BookCourier Backend](https://book-courier-server-snowy.vercel.app/) 🚀

A robust Node.js and Express.js server utilizing MongoDB to manage a book delivery and courier ecosystem. This system features role-based data handling for Admins, Librarians, and Users, including real-time order tracking and statistical analytics.

## 🛠️ Tech Stack

- Runtime: Node.js

- Framework: Express.js

- Database: MongoDB (Atlas)

- Security: CORS, Dotenv, ObjectId validation

- Data Processing: MongoDB Aggregation Framework

## 🚀 Key Features

- Role-Based Access: Specialized endpoints for Admin dashboards, Librarian inventory management, and User shopping experiences.

- Stat Aggregation: Real-time data processing using $group and $lookup to generate monthly revenue and order charts.

- Integrity Protection: Deleting a book removes active orders but preserves historical records in the Librarian-Orders collection.

- Verified Reviews: Only users with a paid status for a specific book can post reviews.

- Financial Tracking: Automatic invoice generation upon payment status updates.

## 🛣️ API Endpoints

**📖 Books**

- GET /books - Fetch all published books.

- GET /books/:id - Get detailed information for a single book.

- POST /books - Add a new book (Librarian).

- PATCH /books/:id - Update book details or stock.

**🛒 Orders & Payments**

- POST /orders - Place a new order (sets status to pending).

- PATCH /orders/pay/:id - Mark as paid, confirm order, and generate invoice.

- PATCH /orders/cancel/:id - Cancel an active order.

**👤 User Dashboard & Stats**

- GET /user/stats/:email - Returns monthly order volume and total spend.

- GET /user/recent-orders/:email - Fetches the last 5 orders with book details.

- GET /wishlist/:email - Retrieves user's saved items.

**👑 Admin & Librarian**

- GET /admin/stats - Global overview (Total users, books, and monthly growth).

- GET /librarian/orders/:email - View orders specific to a librarian's inventory.

- PATCH /admin/users/:id - Change user roles (e.g., promote User to Librarian).
