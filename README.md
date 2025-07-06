# Real-Time Bidding System

A real-time bidding system built with NestJS backend and React frontend, featuring WebSocket-based real-time updates, concurrent bidding support, and auction management.

## 🚀 Features

### Backend (NestJS)
- **Auction Management**: Create, view, and manage auction items
- **Real-Time Bidding**: WebSocket-based real-time bid updates
- **Concurrent Bidding**: Optimistic locking for high-concurrency scenarios
- **Auction Expiration**: Automatic auction end handling
- **User Management**: 100 hardcoded users for testing
- **Database**: PostgreSQL with TypeORM

### Frontend (React)
- **Dashboard**: Display all active auctions with real-time updates
- **Bidding Interface**: Place bids with real-time validation
- **Real-Time Updates**: Live auction data via WebSockets
- **Error Handling**: User-friendly error messages

## 🛠 Tech Stack

- **Backend**: NestJS, TypeORM, PostgreSQL, Socket.io
- **Frontend**: React, Socket.io-client, Axios
- **DevOps**: Docker, Docker Compose
- **Database**: PostgreSQL

## 📋 Prerequisites

- Node.js 18+
- Docker and Docker Compose
- PostgreSQL (if running locally)

## 🚀 Quick Start

### Using Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd bidding-system-backend
   ```

2. **Start the application**
   ```bash
   docker-compose up -d
   ```

3. **Access the application**
   - Backend API: http://localhost:3001
   - Frontend: http://localhost:3000 (if running separately)

### Manual Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   Create a `.env` file:
   ```env
   NODE_ENV=development
   PORT=3001
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=password
   DB_NAME=bidding_system
   FRONTEND_URL=http://localhost:3000
   ```

3. **Start PostgreSQL database**

4. **Run the application**
   ```bash
   npm run start:dev
   ```

## 📚 API Documentation

### Auction Endpoints

#### Create Auction
```http
POST /auctions
Content-Type: application/json

{
  "name": "Vintage Watch",
  "description": "A beautiful vintage timepiece",
  "startingPrice": 100,
  "durationMinutes": 60
}
```

#### Get All Active Auctions
```http
GET /auctions
```

#### Get Auction by ID
```http
GET /auctions/:id
```

#### Place Bid
```http
POST /auctions/:id/bids
Content-Type: application/json

{
  "userId": 1,
  "amount": 150
}
```

#### Get Auction Bids
```http
GET /auctions/:id/bids
```

#### Get Completed Auction Results
```http
GET /auctions/results/completed
```

#### Get Dashboard Statistics
```http
GET /auctions/dashboard/stats
```

### User Endpoints

#### Get All Users
```http
GET /users
```

#### Get User by ID
```http
GET /users/:id
```

## 🔌 WebSocket Events

### Client to Server
- `joinAuction`: Join an auction room
- `leaveAuction`: Leave an auction room

### Server to Client
- `bidUpdate`: Real-time bid updates
- `auctionUpdate`: Auction status updates
- `auctionExpired`: Auction expiration notification
- `userCount`: Number of users in auction

## 🏗 Project Structure

```
bidding-system-backend/
├── src/
│   ├── modules/
│   │   ├── auction/
│   │   │   ├── auction.controller.ts
│   │   │   ├── auction.service.ts
│   │   │   ├── auction.entity.ts
│   │   │   ├── bid.entity.ts
│   │   │   └── dto/
│   │   └── users/
│   │       ├── users.controller.ts
│   │       ├── users.service.ts
│   │       └── users.entity.ts
│   ├── common/
│   │   ├── websocket.gateway.ts
│   │   └── websocket.module.ts
│   ├── migrations/
│   └── main.ts
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## 🔧 Development

### Running Tests
```bash
npm run test
npm run test:e2e
```

### Database Migrations
The application uses TypeORM's auto-synchronization in development. For production, you should use migrations.

### Environment Variables
- `NODE_ENV`: Environment (development/production)
- `PORT`: Application port (default: 3001)
- `DB_HOST`: Database host
- `DB_PORT`: Database port
- `DB_USERNAME`: Database username
- `DB_PASSWORD`: Database password
- `DB_NAME`: Database name
- `FRONTEND_URL`: Frontend URL for CORS

## 🚀 Deployment

### Docker Deployment
1. Build the image:
   ```bash
   docker build -t bidding-system-backend .
   ```

2. Run the container:
   ```bash
   docker run -p 3001:3001 bidding-system-backend
   ```

### Production Considerations
- Use environment variables for sensitive data
- Set up proper database migrations
- Configure reverse proxy (nginx)
- Set up SSL certificates
- Configure proper logging
- Set up monitoring and health checks

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For support and questions, please open an issue in the repository. 