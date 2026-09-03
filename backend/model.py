import sqlite3
import pandas as pd
from sklearn.ensemble import RandomForestRegressor

DATABASE = "foodwise.db"


def train_and_predict(food_name, target_date):

    connection = sqlite3.connect(DATABASE)

    query = """
        SELECT date, sold_quantity
        FROM sales
        WHERE food_item = ?
        ORDER BY date
    """

    df = pd.read_sql_query(
        query,
        connection,
        params=(food_name,)
    )

    connection.close()

    if len(df) < 3:
        return {
            "success": False,
            "message": "Not enough sales data. Add at least 3 records."
        }

    # Prepare data
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date")

    df["day_of_week"] = df["date"].dt.dayofweek
    df["day_of_month"] = df["date"].dt.day
    df["month"] = df["date"].dt.month

    # Previous sales
    df["previous_sales"] = df["sold_quantity"].shift(1)

    # Three-day average
    df["three_day_average"] = (
        df["sold_quantity"]
        .rolling(3)
        .mean()
        .shift(1)
    )

    training_df = df.dropna().copy()

    # Historical average
    historical_average = round(
        df["sold_quantity"].mean()
    )

    # If there isn't enough data for ML,
    # use historical average
    if len(training_df) < 2:

        predicted_demand = historical_average

    else:

        X = training_df[
            [
                "day_of_week",
                "day_of_month",
                "month",
                "previous_sales",
                "three_day_average"
            ]
        ]

        y = training_df["sold_quantity"]

        model = RandomForestRegressor(
            n_estimators=150,
            max_depth=6,
            random_state=42
        )

        model.fit(X, y)

        # Target date
        prediction_date = pd.to_datetime(target_date)

        # Recent sales
        recent_sales = (
            df["sold_quantity"]
            .tail(3)
            .tolist()
        )

        if recent_sales:
            previous_sales = recent_sales[-1]

            three_day_average = (
                sum(recent_sales) /
                len(recent_sales)
            )
        else:
            previous_sales = historical_average
            three_day_average = historical_average

        # Prediction features
        prediction_features = pd.DataFrame({
            "day_of_week": [
                prediction_date.dayofweek
            ],
            "day_of_month": [
                prediction_date.day
            ],
            "month": [
                prediction_date.month
            ],
            "previous_sales": [
                previous_sales
            ],
            "three_day_average": [
                three_day_average
            ]
        })

        prediction = model.predict(
            prediction_features
        )[0]

        predicted_demand = max(
            0,
            round(prediction)
        )

    # Safety buffer
    safety_buffer = max(
        1,
        round(predicted_demand * 0.05)
    )

    # Recommended preparation
    recommended_preparation = (
        predicted_demand +
        safety_buffer
    )

    return {
        "success": True,
        "food": food_name,
        "predicted_demand": predicted_demand,
        "safety_buffer": safety_buffer,
        "recommended_preparation": recommended_preparation,
        "historical_average": historical_average,
        "training_records": len(df)
    }