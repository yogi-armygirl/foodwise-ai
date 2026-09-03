from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3

from model import train_and_predict


app = Flask(__name__)

CORS(app)


def get_database():
    connection = sqlite3.connect("foodwise.db")
    connection.row_factory = sqlite3.Row
    return connection


@app.route("/")
def home():
    return "FoodWise AI Backend is running!"


# ---------------------------------------------------------
# SALES
# ---------------------------------------------------------

@app.route("/api/sales", methods=["POST"])
def add_sale():

    data = request.json

    connection = get_database()
    cursor = connection.cursor()

    cursor.execute("""
        INSERT INTO sales
        (food_item, date, prepared_quantity, sold_quantity)
        VALUES (?, ?, ?, ?)
    """, (
        data["food_item"],
        data["date"],
        data["prepared_quantity"],
        data["sold_quantity"]
    ))

    connection.commit()
    connection.close()

    return jsonify({
        "message": "Sale added successfully!"
    }), 201


@app.route("/api/sales", methods=["GET"])
def get_sales():

    connection = get_database()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT *
        FROM sales
        ORDER BY date DESC
    """)

    sales = [dict(row) for row in cursor.fetchall()]

    connection.close()

    return jsonify(sales)


# ---------------------------------------------------------
# FOOD MANAGEMENT
# ---------------------------------------------------------

@app.route("/api/foods", methods=["GET"])
def get_foods():

    connection = get_database()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT *
        FROM foods
        WHERE active = 1
        ORDER BY food_name ASC
    """)

    foods = [dict(row) for row in cursor.fetchall()]

    connection.close()

    return jsonify(foods)


@app.route("/api/foods", methods=["POST"])
def add_food():

    data = request.json

    food_name = data.get("food_name", "").strip()
    emoji = data.get("emoji", "🍱").strip()

    if not food_name:
        return jsonify({
            "error": "Food name is required."
        }), 400

    if not emoji:
        emoji = "🍱"

    connection = get_database()
    cursor = connection.cursor()

    try:

        cursor.execute("""
            INSERT INTO foods
            (food_name, emoji, active)
            VALUES (?, ?, 1)
        """, (
            food_name,
            emoji
        ))

        connection.commit()

    except sqlite3.IntegrityError:

        connection.close()

        return jsonify({
            "error": "This food already exists."
        }), 409

    connection.close()

    return jsonify({
        "message": "Food added successfully!",
        "food": {
            "food_name": food_name,
            "emoji": emoji,
            "active": 1
        }
    }), 201


# ---------------------------------------------------------
# AI DEMAND PREDICTION
# ---------------------------------------------------------

@app.route("/api/predict/<food_name>", methods=["GET"])
def predict_demand(food_name):

    # Get today's date from request.
    # If frontend sends ?date=2026-09-03,
    # that date will be used for prediction.

    target_date = request.args.get("date")

    if not target_date:

        from datetime import date

        target_date = date.today().isoformat()

    result = train_and_predict(
        food_name,
        target_date
    )

    if not result["success"]:

        return jsonify(result), 400

    return jsonify(result)


# ---------------------------------------------------------
# RUN SERVER
# ---------------------------------------------------------

if __name__ == "__main__":

    app.run(
        debug=True
    )