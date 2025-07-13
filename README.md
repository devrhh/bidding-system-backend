# Real-Time Bidding System

A real-time auction platform with a NestJS backend and React frontend. Supports concurrent bidding, real-time updates via WebSockets, and robust auction expiration handling.

---

## 1. Running the Application Locally

### Prerequisites (for both FE & BE)
- Node.js v18
- Docker & Docker Compose

---

### Backend (NestJS)

**1. Running Using Docker Compose**
```bash
cd bidding-system-backend
docker-compose up --build
```
- This will start the backend and database containers.
- The backend API will be available at [http://localhost:3001].

**2. Running Locally (without Docker) Manual Database Creation (if not using Docker)**
- Open your terminal and connect to PostgreSQL:
  ```sh
  psql -U postgres
  ```
- Create the database:
  ```sql
  CREATE DATABASE bidding_system;
  ```
- Exit psql:
  ```sql
  \q
  ```

- Running Locally:
  ```bash
  cd bidding-system-backend
  npm install
  npm run build
  npm run start:prod
  ```

### Frontend (React)

**1. Using Docker Compose**
```bash
cd bidding-system-frontend
docker-compose up --build
```
- The frontend will be available at [http://localhost:5173](http://localhost:5173).

**2. Running Locally (without Docker)**
```bash
cd bidding-system-frontend
npm install
npm run dev
```
- Make sure your `.env` is configured with the correct backend API URL.

**3. Environment Variables**
- A `.env.example` file is provided as a template for required environment variables.
- **To set up your environment:**
  1. Copy `.env.example` to `.env` in the `bidding-system-frontend/` directory:
     ```sh
     cp .env.example .env
     ```
  2. Edit `.env` as needed for your local setup (e.g., set `VITE_API_URL`).

---

## 2. Approach & Key Decisions

- **Separation of Concerns:** Backend and frontend are in separate folders with their own Dockerfiles and configs.
- **Real-Time Robustness:** All bid and auction updates use WebSockets for live feedback.
- **Race Condition Handling:** Bids are processed in database transactions; backend checks for higher bids before accepting a new one. (more related details are mentioned below)
- **Scalability:** Uses Docker Compose for easy scaling; backend is stateless and can be horizontally scaled.
- **Validation:** Both frontend and backend validate all user input. Backend uses class-validator and additional business logic checks.
- **Resilience:** Backend retries DB connection until available; errors are logged and surfaced to the user.

---

## 3. Race Condition Handling

### Frontend

#### 1. Room & Handler Management

In a real-time auction system, users may view different sets of auctions as they navigate the app (e.g., changing pages ). If the frontend listens to all auction updates globally, it can quickly become inefficient and lead to unnecessary network traffic, duplicate updates, or even missed updates if the user’s view changes. So, with this implementation user will listen to only necessary changes.

**Our approach:**  
- The application dynamically manages WebSocket room subscriptions based on which auctions are currently visible to the user.
- When the user navigates to a new page or changes the set of visible auctions, the app joins the relevant auction rooms and leaves those that are no longer needed.
- Event handlers are only active for the auctions the user is currently viewing, ensuring that only relevant updates are received and processed.

**Benefit:**  
This targeted subscription model prevents duplicate or missed updates, reduces unnecessary network traffic, and ensures that the UI always reflects the latest state of the auctions the user cares about, without relying on timestamp checks or global event listeners.

---

#### 2. Single Handler Registration

In React, it’s possible to accidentally register multiple WebSocket event handlers if you’re not careful with how you set up your effects (e.g., using `useEffect`). If a handler is registered more than once, each incoming event (like a new bid) could trigger multiple times, leading to duplicate updates, inconsistent UI state, or even memory leaks.

**Our approach:**  
- We ensure that each WebSocket event handler (such as for bid updates) is registered only once for the lifetime of the component.
- This is typically done by providing an empty dependency array (`[]`) to the `useEffect` hook that sets up the handler, so it runs only on mount and cleans up on unmount.
- We also make sure to clean up (unsubscribe) the handler when the component unmounts or when the user leaves an auction room, preventing any lingering listeners.

**Benefit:**  
This guarantees that each event is processed exactly once per client, eliminating the risk of duplicate or missed updates due to multiple handler registrations.

---

### Backend

#### 1. Atomic Updates for Bids

In a real-time auction system, multiple users may attempt to place bids on the same auction at nearly the same time. To prevent inconsistent auction states (such as two users both appearing to have the highest bid), we ensure that bid placement is handled atomically at the database level.

**Our approach:**  
- When a new bid is placed, the backend checks within a single database operation that the auction is still open and that the new bid is higher than the current highest bid.
- If two bids arrive at nearly the same time, only the first valid one is accepted; any subsequent conflicting bids are rejected.
- This is achieved using atomic queries or transactions provided by the ORM and database.

**Benefit:**  
This guarantees that only one valid bid is accepted as the highest at any moment, ensuring data consistency and fairness in the auction process. 

---

## 4. CI/CD Pipeline

- **CI:** GitHub Actions runs lint, test, and Docker image build steps on every push and pull request for both frontend and backend.
- **CD:** On merge to main, Docker images are built and a Render deploy hook is triggered to deploy the latest version.
- **Steps to Run Pipeline:**
  1. Push code to GitHub.
  2. GitHub Actions will automatically run lint, tests, and build Docker images for both frontend and backend.
  3. On success, Render deploy hook will trigger deployment automatically.

---

## 5. API Documentation

### Base URL
```
http://localhost:3001
```

### Endpoints

#### Auctions

**GET /auctions**
- Get all active auctions with time left
- Response: Array of auction objects

**POST /auctions**
- Create a new auction
- Body:
  ```json
  {
    "name": "Vintage Watch",
    "description": "A beautiful vintage timepiece",
    "startingPrice": 100.00,
    "auctionEndTime": "2024-12-31T23:59:59.000Z"
  }
  ```

**GET /auctions/:id**
- Get auction details by ID
- Response: Auction object with bids

**POST /auctions/bid**
- Place a bid on an auction
- Body:
  ```json
  {
    "auctionId": 1,
    "userId": 1,
    "amount": 150.00
  }
  ```

**GET /auctions/:id/bids**
- Get all bids for an auction
- Response: Array of bid objects

#### Users

**GET /users**
- Get all users (100 hardcoded users)
- Response: Array of user objects

**GET /users/:id**
- Get user by ID
- Response: User object

### WebSocket Events

**Client to Server:**
- `joinAuction`: Join an auction room
- `leaveAuction`: Leave an auction room

**Server to Client:**
- `bidUpdate`: New bid placed
- `auctionExpired`: Auction has ended