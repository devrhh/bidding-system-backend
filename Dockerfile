# # Use Node.js 18 Alpine as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Remove devDependencies
RUN npm prune --production

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "run", "start:prod"] 