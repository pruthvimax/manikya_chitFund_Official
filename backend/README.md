# 🚀 Manikya Chits Backend

Backend server for the **Manikya Chits Mobile Application**, built using **Node.js, Express, and MongoDB Atlas**, and deployed on **Render Cloud**.

This backend powers all core functionalities like user authentication, member management, chit groups, notifications, and financial tracking.

---

## 🌐 Live API

🔗 https://manikya-chits-backend.onrender.com

### Test Endpoint

```
GET /
```

Response:

```
✅ Manikya Backend Running Successfully 🚀
```

---

## 🧠 Features

* 🔐 Admin & Employee Authentication
* 👥 Member Management (CRUD)
* 💰 Chit Scheme Management
* 🧾 Member History Tracking
* 📊 Outstanding Amount Tracking
* 👨‍👩‍👧 Group Management
* 📩 Notifications System
* 📝 Member Interest Form
* ☁️ Cloud Database (MongoDB Atlas)
* 🌍 Deployed with HTTPS (Render)

---

## 🛠️ Tech Stack

| Technology    | Usage                 |
| ------------- | --------------------- |
| Node.js       | Backend Runtime       |
| Express.js    | API Framework         |
| MongoDB Atlas | Cloud Database        |
| Mongoose      | ODM                   |
| dotenv        | Environment Config    |
| CORS          | Cross-Origin Requests |
| Twilio        | OTP / Messaging       |

---

## 📁 Folder Structure

```
backend/
│
├── controllers/        # Business logic
├── models/             # Mongoose schemas
├── routes/             # API route definitions
│
├── index.js            # Main server file
├── package.json        # Dependencies & scripts
├── .gitignore          # Ignored files
└── .env (local only)   # Environment variables (NOT in repo)
```

---

## ⚙️ Environment Variables

Create a `.env` file in root:

```
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret
TWILIO_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
```

⚠️ Never commit `.env` to GitHub.

---

## ▶️ Running Locally

### 1. Install dependencies

```
npm install
```

### 2. Start server

```
npm start
```

Server runs at:

```
http://localhost:5000
```

---

## 🌍 API Base URL

### Local

```
http://localhost:5000/api
```

### Production

```
https://manikya-chits-backend.onrender.com/api
```

---

## 📌 API Endpoints

### 🔐 Admin

```
/api/admin
```

### 👨‍💼 Employee

```
/api/employee
```

### 👥 Members

```
/api/members
```

### 💰 Chit Schemes

```
/api/chitscheme
```

### 📜 Member History

```
/api/member-history
```

### 🧾 Member Interest

```
/api/member-interest
```

### 👨‍👩‍👧 Groups

```
/api/groups
```

### 🔔 Notifications

```
/api/notifications
```

### 📊 Outstanding

```
/api/outstanding
```

---

## 🧪 Example API Call

```
GET /api/members
```

Response:

```json
[
  {
    "_id": "123",
    "name": "John Doe",
    "phone": "9876543210"
  }
]
```

---

## 🚀 Deployment (Render)

### Steps:

1. Push backend code to GitHub
2. Go to Render → Create Web Service
3. Connect GitHub repo
4. Configure:

   * Build Command: `npm install`
   * Start Command: `npm start`
5. Add Environment Variables in Render dashboard
6. Deploy

---

## ⚠️ Important Notes

* Backend is deployed on **Render free tier**
* First request may take **20–30 seconds** (cold start)
* Uses **MongoDB Atlas (cloud database)**
* Ensure all API calls use HTTPS in production

---

## 🔐 Security Best Practices

* `.env` is ignored using `.gitignore`
* Secrets are stored only in Render environment variables
* No credentials are exposed in source code

---

## 📱 Connected Frontend

This backend is used by:

👉 Expo React Native Mobile App (Manikya Chits)

Play Store Deployment:

* Internal Testing ✅
* Closed Testing ✅
* Production (In progress 🚀)

---

## 👨‍💻 Authors

**Pruthvi G**
**Harisha Patil**

* 💻 Fullstack Developers (MERN + React Native)
* 📱 Mobile App Developers
* 🌐 Backend Systems Builders

---

## 🚀 Future Enhancements

* 💳 Payment Gateway Integration
* 🔔 Push Notifications (FCM)
* 📈 Analytics Dashboard
* ⚡ Performance Optimization
* 🔐 Role-based Access Control
* 📊 Reports & Export Features

---

## ⭐ Support

If you found this project helpful:

⭐ Star the repository
🤝 Contribute or suggest improvements

---

## 📄 License

This project is for educational and production use.

---
