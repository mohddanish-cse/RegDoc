import os
import datetime
from dotenv import load_dotenv
from pymongo import MongoClient
from flask import Flask # <-- Import Flask to help initialize the extension
from flask_bcrypt import Bcrypt # <-- Import Bcrypt
from app.crypto_utils import generate_keys

# --- Configuration ---
load_dotenv()
MONGO_URI = os.getenv("MONGO_URI")

# We need a temporary Flask app instance to initialize Bcrypt
app = Flask(__name__)
bcrypt = Bcrypt(app)

USERS_TO_CREATE = [
    {"username": "Admin User", "email": "admin@regdoc.com", "password": "regdoc", "role": "Admin"},
    {"username": "Approver User", "email": "approver@regdoc.com", "password": "regdoc", "role": "Approver"},
    {"username": "Reviewer User", "email": "reviewer@regdoc.com", "password": "regdoc", "role": "Reviewer"},
    {"username": "Contributor User", "email": "contributor@regdoc.com", "password": "regdoc", "role": "Contributor"}
]

def seed_users():
    """Connects to the database and creates a set of sample users."""
    client = None
    try:
        client = MongoClient(MONGO_URI)
        db = client.RegDocDB
        users_collection = db.users
        print("Connected to the database successfully.")
        
        users_collection.drop()
        print("Cleared existing users.")

        for user_data in USERS_TO_CREATE:
            # --- THIS IS THE FIX ---
            # Use Bcrypt to hash the password, just like in our main app
            hashed_password = bcrypt.generate_password_hash(user_data["password"]).decode('utf-8')
            
            private_key, public_key = generate_keys()
            new_user = {
                "username": user_data["username"],
                "email": user_data["email"],
                "password": hashed_password,
                "role": user_data["role"],
                "created_at": datetime.datetime.now(datetime.timezone.utc),
                "private_key": private_key,
                "public_key": public_key
            }
            users_collection.insert_one(new_user)
            print(f"Successfully created user: {user_data['email']} with role: {user_data['role']}")
        
        print("\nDatabase seeding complete!")
    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        if client:
            client.close()

if __name__ == "__main__":
    seed_users()