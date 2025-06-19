#!/usr/bin/env python3
import os
from pymongo import MongoClient, UpdateOne
import pandas as pd

def main():
    # Configuration: you can set these via environment or edit directly
    MONGO_URI      = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    DB_NAME        = os.getenv("DB_NAME", "pinsight")
    RAW_COLLECTION = os.getenv("RAW_COLLECTION", "products")
    SUMMARY_COLLECTION = os.getenv("SUMMARY_COLLECTION", "products_summary")

    # Connect to MongoDB
    client = MongoClient(MONGO_URI)
    db     = client[DB_NAME]

    # Load raw documents with only necessary fields
    cursor = db[RAW_COLLECTION].find(
        {},
        {"City":1, "Company":1, "Client_Name":1, "Brand":1, "Name":1, "Unique_Product_ID":1,
         "MRP":1, "Selling_Price":1, "Discount":1,
         "Availability":1, "Pincode":1, "Platform":1, "Category":1, "Report_Date":1}
    )
    raw = pd.DataFrame(list(cursor))
    if raw.empty:
        print("No raw data found in collection '{}'".format(RAW_COLLECTION))
        return

    # Add helper functions to compute availability flags
    def compute_availability_flag(av):
        """Return 1 if the item is listed (Availability Yes or No), otherwise 0."""
        return 1 if str(av).strip().lower() in ("yes", "no") else 0

    def compute_available_flag(av):
        """Return 1 if the item is available (Availability Yes), otherwise 0."""
        return 1 if str(av).strip().lower() == "yes" else 0

    # Compute flags for aggregation
    raw["availabilityFlag"] = raw["Availability"].apply(compute_availability_flag)
    raw["availableFlag"]    = raw["Availability"].apply(compute_available_flag)

    # Coerce numeric fields to numeric types, converting invalid entries to NaN
    raw["MRP"] = pd.to_numeric(raw["MRP"], errors="coerce")
    raw["Selling_Price"] = pd.to_numeric(raw["Selling_Price"], errors="coerce")
    raw["Discount"] = pd.to_numeric(raw["Discount"], errors="coerce")

    # Ensure we count by unique Pincode per client group
    unique_pincode = raw.drop_duplicates(subset=[
        "City", "Company", "Client_Name", "Brand", "Name", "Unique_Product_ID",
        "Platform", "Category", "Report_Date", "Pincode"
    ])
    df_summary = (
        unique_pincode
        .groupby(["City", "Company", "Client_Name", "Brand", "Name", "Unique_Product_ID", "Platform", "Category", "Report_Date"], as_index=False)
        .agg(
            totalCount     = ("Pincode",             "count"),
            listedCount    = ("availabilityFlag",    "sum"),
            availableCount = ("availableFlag",       "sum"),
            MRP            = ("MRP",                 "mean"),
            Selling_Price  = ("Selling_Price",        "mean"),
            Discount       = ("Discount",             "mean"),
        )
    )

    # # Compute percentage metrics so the UI is just a lookup
    # df_summary["coveragePct"]     = (df_summary["availableCount"] / df_summary["totalCount"] * 100).fillna(0)
    # df_summary["penetrationPct"]  = (df_summary["listedCount"]  / df_summary["totalCount"] * 100).fillna(0)
    # df_summary["availabilityPct"] = (df_summary["availableCount"] / df_summary["listedCount"] * 100).fillna(0)

    # Prepare bulk upsert operations
    ops = []
    for record in df_summary.to_dict("records"):
        # Build the filter/key for each group, including all grouping fields
        key = {
            "City": record["City"],
            "Company": record["Company"],
            "Client_Name": record["Client_Name"],
            "Brand": record["Brand"],
            "Name": record["Name"],
            "Unique_Product_ID": record["Unique_Product_ID"],
            "Platform": record["Platform"],
            "Category": record["Category"],
            "Report_Date": record["Report_Date"]
        }
        # Upsert the full aggregated record
        ops.append(
            UpdateOne(
                key,
                {"$set": record},
                upsert=True
            )
        )
        # Flush in batches
        if len(ops) >= 500:
            db[SUMMARY_COLLECTION].bulk_write(ops)
            ops = []
    # Final flush
    if ops:
        db[SUMMARY_COLLECTION].bulk_write(ops)

    # Ensure unique index on the grouping keys
    db[SUMMARY_COLLECTION].create_index(
        [("City", 1), ("Company", 1), ("Client_Name", 1), ("Brand", 1), ("Name", 1), ("Unique_Product_ID", 1), ("Platform", 1), ("Category", 1), ("Report_Date", 1)],
        unique=True
    )

    print(f"Upserted {len(df_summary)} summary records into '{SUMMARY_COLLECTION}'.")

if __name__ == "__main__":
    main()