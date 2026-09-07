#!/bin/bash

# Start the Setu prototype

echo "🌉 Starting Setu Prototype (SIH PS26043)"
echo "----------------------------------------"

# 1. Start Backend in background
echo "-> Starting Backend (FastAPI)..."
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 9000 &
BACKEND_PID=$!
cd ..

# 2. Wait for backend to be ready (it needs to download models and seed DB on first run)
echo "-> Waiting for backend to initialize (this takes 30-60s on first run)..."
while ! curl -s http://localhost:9000/api/health > /dev/null; do
  sleep 2
done
echo "-> Backend ready!"

# 3. Start Frontend in background
echo "-> Starting Frontend (React)..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "----------------------------------------"
echo "✅ Setu is running!"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:9000/docs"
echo "----------------------------------------"
echo "Press Ctrl+C to stop both servers."

# Wait for Ctrl+C
trap "echo 'Stopping Setu...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
