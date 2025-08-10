import os
from flask import Flask
from dotenv import load_dotenv
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# Get the MongoDB connection string from environment variables
MONGO_URI = os.getenv("MONGO_URI")

# Create a new client and connect to the server
# We are using a try-except block to gracefully handle connection errors
try:
    client = MongoClient(MONGO_URI, server_api=ServerApi('1')) #Line that creates the connection to your db.
    # Send a ping to confirm a successful connection
    client.admin.command('ping')
    print("Pinged your deployment. You successfully connected to MongoDB!")
    # Get a reference to the db
    db = client.RegDocDB # You can change "RegDocDB" to your preferred db name
except Exception as e:
    print(e)
    db = None # Set db to None if connection fails

@app.route("/")
def home():
    if db is not None:
        return "<h1>Connection to MongoDB was successful!</h1>"
    else:
        return "<h1>Failed to connect to MongoDB.</h1> Check your connection string and IP whitelist."


if __name__ == "__main__":
    app.run(debug=True)