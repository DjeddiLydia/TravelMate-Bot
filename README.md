# TravelMate-Bot

📋 Prerequisites 

Before starting, install the following tools: 

1. Python 3.12+ 

Go to python.org/downloads 

Click "Download Python 3.x.x" (the big yellow button) 

Run the installer — ⚠️ on Windows, check the box that says "Add Python to PATH" before clicking Install 

2. Node.js 24 LTS 

Go to nodejs.org 

Click the "LTS" version button and run the installer 

Leave all options at their defaults 

3. A free Groq API key 

Go to console.groq.com 

Create a free account 

Navigate to API Keys in the sidebar 

Click "Create API Key", give it a name, and copy the key — you'll need it in a moment 

 

📁 Project Structure 

Clone from github repository to preferred IDE (ie: VS code);  https://github.com/DjeddiLydia/TravelMate-Bot 

travelmate-bot/ 
├── backend/ 
│   ├── main.py        ← FastAPI server 
│   └── .env           ← Your secret API key (you will create this) 
└── frontend/ 
   ├── app/ 
   │   ├── layout.js 
   │   └── page.js 
   └── package.json 
 

 

⚙️ Backend Setup 

Open a terminal. On Windows, use Command Prompt (search "cmd" in the Start menu — not PowerShell). 

Step 1 — Navigate to the backend folder 

cd path/to/travelmate-bot/backend 
 

Step 2 — Create a Python virtual environment 

(if Windows) RUN ON COMMAND PROMPT NOT POWERSHELL 

python -m venv venv 
 

Step 3 — Activate the virtual environment 

Windows (Command Prompt): 

venv\Scripts\activate 
 

Mac / Linux: 

source venv/bin/activate 
 

✅ You should now see (venv) at the start of your terminal line — this means it's working. 

Step 4 — Install Python dependencies 

pip install fastapi uvicorn groq python-dotenv 
 

Step 5 — Create the .env file 

In the backend/ folder, create a file named exactly .env (no other extension) and paste in: 

GROQ_API_KEY=your_key_here 
 

Replace your_key_here with the API key you copied from console.groq.com. 

⚠️ Never share this file or commit it to GitHub. 

Step 6 — Start the backend server 

uvicorn main:app --reload 
 

You should see output ending in: 

INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit) 
 

Step 7 — Verify the backend works 

Open your browser and go to: http://127.0.0.1:8000/docs 

 

🖥️ Frontend Setup 

Open a new terminal window (keep the backend running in the first one). 

Step 1 — Navigate to the frontend folder 

cd path/to/travelmate-bot/frontend 
 

Step 2 — Install Node.js dependencies 

npm install 
 

Step 3 — Start the frontend development server 

npm run dev 
 

You should see: 

▲ Next.js 14.x.x 
- Local: http://localhost:3000 
 

Step 4 — Open the app 

Go to http://localhost:3000 in your browser. You should see the TravelMate Bot interface. 

 

🧪 Testing the Full App 

With both servers running: 

Fill in the form (dates are required) 

Click "Générer mon itinéraire" 

Wait ~5–15 seconds for the AI to respond 

Your itinerary should appear below the form ✅ 

The 3 modes: What happens depending on user input:

Destination filled + Budget filled 

Generates a detailed day-by-day itinerary 

Destination filled, no Budget 

Generates 3 budget variants (budget/mid/luxury) 

No Destination 

Suggests 3 destination ideas 

🔄 How to Restart the App Later 

Every time you want to run the app again, you need to start both servers: 

Terminal 1 — Backend: 

cd path/to/travelmate-bot/backend 
# Windows: 
venv\Scripts\activate 
# Mac/Linux: 
source venv/bin/activate 
 
uvicorn main:app --reload 
 

Terminal 2 — Frontend: 

cd path/to/travelmate-bot/frontend 
npm run dev
