// Mock data for the dashboard

// KPI data
export const kpiData = {
  skusTracked: 1245,
  avgDiscount: 15.8,
  topPlatform: "Swiggy",
  stockOutDelta: -3.2,
}

// Time series data for Overview page
export const timeSeriesData = [
  { date: "2025-04-01", value: 1200 },
  { date: "2025-04-02", value: 1300 },
  { date: "2025-04-03", value: 1250 },
  { date: "2025-04-04", value: 1400 },
  { date: "2025-04-05", value: 1350 },
  { date: "2025-04-06", value: 1500 },
  { date: "2025-04-07", value: 1600 },
  { date: "2025-04-08", value: 1550 },
  { date: "2025-04-09", value: 1700 },
  { date: "2025-04-10", value: 1650 },
  { date: "2025-04-11", value: 1800 },
  { date: "2025-04-12", value: 1750 },
  { date: "2025-04-13", value: 1900 },
  { date: "2025-04-14", value: 1850 },
]

// Regional data for Regional Analysis page
export const regionalData = [
  { city: "Mumbai", pincode: "400001", stockAvailability: 92, stockOutPercent: 8 },
  { city: "Delhi", pincode: "110001", stockAvailability: 88, stockOutPercent: 12 },
  { city: "Bangalore", pincode: "560001", stockAvailability: 95, stockOutPercent: 5 },
  { city: "Hyderabad", pincode: "500001", stockAvailability: 90, stockOutPercent: 10 },
  { city: "Chennai", pincode: "600001", stockAvailability: 85, stockOutPercent: 15 },
  { city: "Kolkata", pincode: "700001", stockAvailability: 82, stockOutPercent: 18 },
  { city: "Pune", pincode: "411001", stockAvailability: 93, stockOutPercent: 7 },
  { city: "Ahmedabad", pincode: "380001", stockAvailability: 87, stockOutPercent: 13 },
  { city: "Jaipur", pincode: "302001", stockAvailability: 80, stockOutPercent: 20 },
  { city: "Lucknow", pincode: "226001", stockAvailability: 78, stockOutPercent: 22 },
  { city: "Kanpur", pincode: "208001", stockAvailability: 75, stockOutPercent: 25 },
  { city: "Nagpur", pincode: "440001", stockAvailability: 83, stockOutPercent: 17 },
  { city: "Indore", pincode: "452001", stockAvailability: 89, stockOutPercent: 11 },
  { city: "Thane", pincode: "400601", stockAvailability: 91, stockOutPercent: 9 },
  { city: "Bhopal", pincode: "462001", stockAvailability: 81, stockOutPercent: 19 },
  { city: "Visakhapatnam", pincode: "530001", stockAvailability: 84, stockOutPercent: 16 },
  { city: "Patna", pincode: "800001", stockAvailability: 76, stockOutPercent: 24 },
  { city: "Vadodara", pincode: "390001", stockAvailability: 86, stockOutPercent: 14 },
  { city: "Ghaziabad", pincode: "201001", stockAvailability: 88, stockOutPercent: 12 },
  { city: "Ludhiana", pincode: "141001", stockAvailability: 79, stockOutPercent: 21 },
]

// Platform data for Platform Insights page
export const platformData = [
  {
    name: "Swiggy",
    salesValue: 1250000,
    priceChange: 2.5,
    discountChange: -1.2,
    availabilityChange: 3.8,
  },
  {
    name: "Flipkart",
    salesValue: 980000,
    priceChange: -1.8,
    discountChange: 3.5,
    availabilityChange: 1.2,
  },
  {
    name: "Zepto",
    salesValue: 750000,
    priceChange: 0.5,
    discountChange: 0.8,
    availabilityChange: 4.5,
  },
  {
    name: "Blinkit",
    salesValue: 620000,
    priceChange: -0.7,
    discountChange: 2.3,
    availabilityChange: 2.1,
  },
]

// Platform share data
export const platformShareData = [
  { name: "Swiggy", value: 35 },
  { name: "Flipkart", value: 28 },
  { name: "Zepto", value: 21 },
  { name: "Blinkit", value: 16 },
]

// Brand data for Brand Evaluation page
export const brandData = [
  {
    name: "Coca Cola",
    avgDiscount: 12.5,
    availability: 94,
    skuCount: 45,
    products: [
      { name: "Coca Cola Classic", mrp: 40, sellingPrice: 35, availability: 96 },
      { name: "Diet Coke", mrp: 45, sellingPrice: 40, availability: 92 },
      { name: "Coca Cola Zero", mrp: 45, sellingPrice: 38, availability: 90 },
    ],
  },
  {
    name: "Pepsi",
    avgDiscount: 14.2,
    availability: 92,
    skuCount: 38,
    products: [
      { name: "Pepsi", mrp: 40, sellingPrice: 34, availability: 95 },
      { name: "Pepsi Diet", mrp: 45, sellingPrice: 39, availability: 88 },
      { name: "Pepsi Black", mrp: 45, sellingPrice: 37, availability: 86 },
    ],
  },
  {
    name: "Nestle",
    avgDiscount: 10.8,
    availability: 96,
    skuCount: 72,
    products: [
      { name: "Nescafe Classic", mrp: 250, sellingPrice: 225, availability: 98 },
      { name: "KitKat", mrp: 40, sellingPrice: 36, availability: 97 },
      { name: "Maggi", mrp: 14, sellingPrice: 12, availability: 99 },
    ],
  },
  {
    name: "Unilever",
    avgDiscount: 8.5,
    availability: 97,
    skuCount: 65,
    products: [
      { name: "Dove Soap", mrp: 60, sellingPrice: 54, availability: 98 },
      { name: "Surf Excel", mrp: 140, sellingPrice: 130, availability: 96 },
      { name: "Lipton Tea", mrp: 120, sellingPrice: 110, availability: 95 },
    ],
  },
  {
    name: "P&G",
    avgDiscount: 11.2,
    availability: 93,
    skuCount: 58,
    products: [
      { name: "Tide", mrp: 120, sellingPrice: 105, availability: 94 },
      { name: "Gillette", mrp: 250, sellingPrice: 225, availability: 92 },
      { name: "Pampers", mrp: 999, sellingPrice: 899, availability: 90 },
    ],
  },
]

// Product data
export const productData = brandData.flatMap((brand) =>
  brand.products.map((product) => ({
    brand: brand.name,
    ...product,
  })),
)
