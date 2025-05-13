# Pinsight E-Commerce Analytics Dashboard

A powerful dashboard for tracking and analyzing e-commerce product data across multiple platforms.

## New Features

- MongoDB Integration: Data is now fetched from MongoDB instead of CSV files
- User Authentication: Login system with role-based access control
- Client-Based Data Filtering: Users can only view data for their assigned client
- Admin Registration Page: Admins can register new users and assign them to clients

## Environment Setup

Create a `.env.local` file in the root directory with the following variables:

```
# MongoDB Connection String
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/your-database?retryWrites=true&w=majority

# NextAuth Secret
NEXTAUTH_SECRET=your-nextauth-secret-key

# Optional - The base URL of your site
NEXTAUTH_URL=http://localhost:3000

# Set to true to enable admin access when creating the first user
ENABLE_FIRST_USER_ADMIN=true
```

## MongoDB Setup

1. Create a MongoDB database (either locally or using MongoDB Atlas)
2. Replace the `MONGODB_URI` in your `.env.local` file with your actual connection string

## Initialize Admin User

Run the initialization script to create the admin user:

```bash
node scripts/init-admin.js
```

This will create an admin user with the following credentials:
- Username: admin
- Password: admin123

**Important**: Change the password immediately after first login.

## MongoDB Data Schema

The application uses the following collections:

### Users Collection

```json
{
  "_id": ObjectId,
  "userId": String,
  "password": String (hashed),
  "clientName": String,
  "role": String (admin or user),
  "createdAt": Date
}
```

### ProductData Collection

```json
{
  "_id": ObjectId,
  "Sn._No": Number,
  "Report_Date": Date,
  "Unique_Product_ID": String,
  "Brand": String,
  "Client_Name": String,
  "Name": String,
  "Quantity": String,
  "City": String,
  "Pincode": String,
  "SKU_ID": String,
  "Platform": String,
  "MRP": NumberDouble,
  "Selling_Price": NumberDouble,
  "Comp_ID": String,
  "Availability": String,
  "Discount": NumberDouble,
  "Added_To_DB": Date
}
```

## Running the Application

Install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to access the application.

## Deployment

Build the application for production:

```bash
npm run build
# or
yarn build
# or
pnpm build
```

Start the production server:

```bash
npm start
# or
yarn start
# or
pnpm start
```

## Features

- **Data Visualization**: Interactive charts and graphs to visualize key metrics
- **Brand Analysis**: Evaluate brand performance across different platforms
- **Platform Comparison**: Compare metrics across e-commerce platforms
- **Regional Insights**: Analyze performance by region and location
- **Custom Data Import**: Upload your own CSV data for analysis
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Dark/Light Mode**: Switch between dark and light themes
- **Export Functionality**: Export data and reports

## Data Format

The dashboard expects CSV data in the following format:

| Field | Description |
|-------|-------------|
| Sn. No | Serial number |
| Report Date | Date of the report (DD-MM-YYYY) |
| Run Date | Date the report was run (DD-MM-YYYY) |
| Unique Product ID | Unique identifier for the product |
| Brand Name | Name of the brand |
| Category | Product category |
| Product Description | Description of the product |
| Quantity | Product quantity |
| City | City where the product is available |
| Pincode | Postal code |
| Area | Specific area within the city |
| FG Code | Finished goods code |
| SKU ID | Stock keeping unit ID |
| Platform | E-commerce platform name |
| MRP | Maximum retail price |
| Selling Price | Actual selling price |
| Stock Availability (Y/N) | Whether the product is in stock |
| Discount | Discount percentage |

A sample CSV file is included in the `/public` directory.

## Usage

1. **Overview Dashboard**: The main dashboard provides a summary of key metrics and insights.
2. **Brand Evaluation**: Analyze brand performance, discounts, and availability.
3. **Platform Insights**: Compare performance across different e-commerce platforms.
4. **Regional Analysis**: View stock availability by pincode regions and identify geographical trends.
5. **Settings**: Customize dashboard appearance and configure preferences.

## Tech Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- Recharts for data visualization
- shadcn/ui components
- next-themes for theme switching

## License

MIT 