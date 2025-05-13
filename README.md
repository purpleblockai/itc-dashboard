# E-Commerce Analytics Dashboard

A comprehensive dashboard for tracking and analyzing e-commerce product data across multiple platforms, providing insights on product availability, penetration, and coverage across various regions.

## Key Features

- **Advanced Metrics Calculation**: Track penetration, availability, and coverage metrics across e-commerce platforms
- **Platform Insights**: Compare performance across Swiggy, Flipkart, Zepto, Blinkit, and other platforms
- **Regional Analysis**: Analyze performance by city and pincode
- **Brand Evaluation**: Compare metrics across different brands
- **Responsive Design**: Fully responsive UI that works on all devices
- **MongoDB Integration**: Data is fetched from MongoDB database
- **User Authentication**: Role-based access control system
- **Client-Based Filtering**: Users can only view data for their assigned client
- **Admin Registration**: Administrators can register new users and assign them to clients
- **Dark/Light Mode**: Switch between dark and light themes

## Metric Definitions

The dashboard calculates the following key metrics:

- **Penetration**: Listed Pincodes / Serviceable Pincodes
  - Measures what percentage of serviceable areas have products listed
  
- **Availability**: Available Pincodes / Listed Pincodes
  - Measures what percentage of listed products are actually available for purchase
  
- **Coverage Method 1**: Availability % × Penetration %
  - Combined metric showing overall market presence
  
- **Coverage Method 2**: Available Pincodes / Serviceable Pincodes
  - Direct measure of available products in serviceable areas

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

## Installation and Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd E-Com-Dashboard
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. Set up MongoDB:
   - Create a MongoDB database (either locally or using MongoDB Atlas)
   - Replace the `MONGODB_URI` in your `.env.local` file with your connection string

4. Initialize admin user:
   ```bash
   node scripts/init-admin.js
   ```
   This will create an admin user with:
   - Username: admin
   - Password: admin123
   
   **Important**: Change the password immediately after first login.

5. Run the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser to access the application.

## Production Deployment

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

## Data Schema

The application uses the following MongoDB collections:

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
  "Run_Date": Date,
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
  "Availability": String,
  "Discount": NumberDouble,
  "Added_To_DB": Date
}
```

## Dashboard Usage

1. **Login**: Enter your credentials to access the dashboard
2. **Filter Data**: Use the filter bar to select brand, platform, city, and date range
3. **Overview Dashboard**: View summary of key metrics
4. **Platform Insights**: Compare metrics across different e-commerce platforms
5. **Brand Evaluation**: Analyze brand performance
6. **Regional Analysis**: Investigate performance by city and pincode

## Tech Stack

- **Framework**: Next.js 15
- **Language**: TypeScript
- **Database**: MongoDB
- **Authentication**: NextAuth.js
- **UI Components**: 
  - shadcn/ui
  - Tailwind CSS
  - Radix UI primitive components
- **Data Visualization**: Recharts
- **Form Handling**: React Hook Form with Zod validation
- **Styling**: Tailwind CSS with CSS animations
- **Theme Switching**: next-themes

## Troubleshooting

- If metrics don't display correctly, check browser console logs for debugging information
- Ensure MongoDB connection is properly configured
- Verify that data in the database follows the expected schema

## License

MIT 