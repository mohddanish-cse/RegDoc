from flask import Flask

# Create an instance of the Flask class.
# __name__ is a special variable that gets the name of the current Python file.
app = Flask(__name__)

# Define a route for the root URL "/"
@app.route("/")
def home():
    return "Hello, World! This is the RegDoc backend."

# This block allows us to run the app directly using "python app.py"
# The server will only run if the script is executed directly.
if __name__ == "__main__":
    # app.run() starts the development server.
    # debug=True enables auto-reloading and shows detailed errors.
    app.run(debug=True)