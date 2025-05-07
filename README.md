# Nuvr E-Commerce Analytics Dashboard

A comprehensive dashboard for e-commerce analytics that provides insights into brand performance, platform comparison, and regional analysis.

## Features

- **Data Visualization**: Interactive charts and graphs to visualize key metrics
- **Brand Analysis**: Evaluate brand performance across different platforms
- **Platform Comparison**: Compare metrics across e-commerce platforms
- **Regional Insights**: Analyze performance by region and location
- **Custom Data Import**: Upload your own CSV data for analysis
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Dark/Light Mode**: Switch between dark and light themes
- **Export Functionality**: Export data and reports

## Getting Started

### Prerequisites

- Node.js 18.18.0 or higher
- npm or pnpm

### Installation

1. Clone the repository
```bash
git clone https://github.com/your-username/nuvr-dashboard.git
cd nuvr-dashboard
```

2. Install dependencies
```bash
npm install
# or
pnpm install
```

3. Run the development server
```bash
npm run dev
# or
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the dashboard.

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