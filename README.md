# Identity Reconciliation Service

A web service designed to reconcile customer identities across multiple purchases using their email and phone number. This service identifies whether a purchase belongs to an existing customer or a new one and links multiple contact records together.

## 🚀 Project Overview

The service provides a single endpoint `/identify` which accepts a JSON payload containing an `email` and/or `phoneNumber`. It reconciles these details with a database to return a consolidated view of the customer's identity, linking primary and secondary contacts.

### Key Features
- **Identity Linking**: Automatically links contacts sharing the same email or phone number.
- **Primary/Secondary Classification**: Tracks the oldest contact as the "Primary" and subsequent matches as "Secondary".
- **Dynamic Merging**: Merges two previously separate primary contacts if a new purchase links them together.

## 🛠️ Technology Stack

- **Backend**: Node.js, Express
- **Database**: SQLite (managed via Sequelize ORM)
- **Utilities**: CORS, Body-Parser, Nodemon (Development)

## 💻 Setup Instructions

### Prerequisites
- [Node.js](https://nodejs.org/) (v14 or higher)
- npm (installed with Node.js)

### Installation

1. **Clone the repository:**
   ```bash
   git clone "https://github.com/ASHISH-SAINI78021/identity-reconciliation.git"
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the server:**
   ```bash
   npm start
   ```
   *Note: The server runs on `http://localhost:3000` by default. The database (SQLite) will be initialized automatically on the first run.*

## API Usage

### Endpoints

#### POST `/identify`
Accepts `email` and/or `phoneNumber` to reconcile identity.

**Request Body:**
```json
{
  "email": "mcfly@gmail.com",
  "phoneNumber": "123456"
}
```

**Response:**
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["lorraine@destinationrc.com", "mcfly@gmail.com"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": [2]
  }
}
```

## 🌐 Deployment Link

(https://identity-reconciliation-uwd7.onrender.com/)

### Recommended Deployment (Render)

1.  **Create a new Web Service**: Connect your GitHub repository.
2.  **Build Command**: `npm install`
3.  **Start Command**: `npm start`
4.  **Database**: Since this uses SQLite, the database will reside in the instance's disk. 
    > [!NOTE]
    > For production use with persistent data, consider mounting a [Render Disk](https://render.com/docs/disks) at `/opt/render/project/src/data` and updating the database storage path in `models/contact.js`.
