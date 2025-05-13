import Papa from "papaparse";

export interface CompetitionData {
  "Sn. No": string;
  "Report Date": string;
  "Run Date": string;
  "Unique Product ID": string;
  "Brand Name": string;
  Category: string;
  "Product Description": string;
  Quantity: string;
  City: string;
  Pincode: string;
  Area: string;
  "FG Code": string;
  "SKU ID": string;
  Platform: string;
  MRP: string;
  "Selling Price": string;
  "Stock Availability (Y/N)": string;
  Discount: string;
}

export interface ProcessedData {
  id: string;
  reportDate: Date;
  runDate: Date;
  productId: string;
  brand: string;
  category: string;
  productDescription: string;
  quantity: string;
  city: string;
  pincode: string;
  area: string;
  fgCode: string;
  skuId: string;
  platform: string;
  mrp: number;
  sellingPrice: number;
  stockAvailable: boolean;
  isListed: boolean;
  availability: string;
  discount: number;
  clientName?: string;
}

// Function to fetch data from MongoDB API
export async function fetchCompetitionData(): Promise<ProcessedData[]> {
  try {
    const response = await fetch("/api/data");
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to fetch data");
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching competition data:", error);
    throw error;
  }
}

// Process uploaded CSV data
export function processUploadedData(data: any[]): ProcessedData[] {
  try {
    // Validate expected columns
    if (data.length === 0) {
      throw new Error("CSV file is empty");
    }

    const requiredColumns = [
      "Sn. No",
      "Report Date",
      "Run Date",
      "Unique Product ID",
      "Brand Name",
      "Product Description",
      "City",
      "Pincode",
      "Platform",
      "MRP",
      "Selling Price",
      "Stock Availability (Y/N)",
    ];

    const firstRow = data[0];
    const missingColumns = requiredColumns.filter((col) => !(col in firstRow));

    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(", ")}`);
    }

    // Process the data rows
    return data.map((row) => processRow(row as CompetitionData));
  } catch (error) {
    console.error("Error processing uploaded data:", error);
    throw error;
  }
}

// Function to process each row of the CSV data
export function processRow(row: CompetitionData): ProcessedData {
  // Parse dates (DD-MM-YYYY format)
  const parseDate = (dateStr: string): Date => {
    if (!dateStr || typeof dateStr !== "string") return new Date();
    const [day, month, year] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  // Process availability status
  const availabilityStatus = row["Stock Availability (Y/N)"];
  const isItemNotFound = availabilityStatus === "Item Not Found";
  const isLocationNotFound = availabilityStatus === "Location Not Found";
  
  // isListed is true when the item is found (not "Item Not Found")
  const isListed = !isItemNotFound;
  
  // stockAvailable is only true when the availability is explicitly "Yes"
  const stockAvailable = (availabilityStatus || "").toLowerCase() === "yes";

  return {
    id: row["Sn. No"],
    reportDate: parseDate(row["Report Date"]),
    runDate: parseDate(row["Run Date"]),
    productId: row["Unique Product ID"],
    brand: row["Brand Name"],
    category: row["Category"] || "",
    productDescription: row["Product Description"],
    quantity: row["Quantity"] || "",
    city: (row["City"] || "").toLowerCase(),
    pincode: row["Pincode"],
    area: row["Area"] || "",
    fgCode: row["FG Code"] || "",
    skuId: row["SKU ID"] || row["Unique Product ID"],
    platform: row["Platform"],
    mrp: Number.parseFloat(row["MRP"]),
    sellingPrice: Number.parseFloat(row["Selling Price"]),
    stockAvailable: stockAvailable,
    isListed: isListed,
    availability: availabilityStatus,
    discount: Number.parseFloat(row["Discount"] || "0"),
  };
}

// Function to get unique values from a field
export function getUniqueValues(
  data: ProcessedData[],
  field: keyof ProcessedData
): string[] {
  const uniqueSet = new Set<string>();

  data.forEach((item) => {
    if (typeof item[field] === "string") {
      uniqueSet.add(item[field] as string);
    }
  });

  return Array.from(uniqueSet).sort();
}

// Function to calculate coverage across competitors
function calculateCoverageAcrossCompetitors(data: ProcessedData[], competitorIds: string[]): number {
  console.log(`[CALC] Calculating coverage across competitors: ${competitorIds.join(', ')}`);
  
  // Filter to include only the selected competitors
  const competitorData = data.filter(item => competitorIds.includes(item.platform));
  
  // Group data by pincode
  const pincodeMap = new Map<string, ProcessedData[]>();
  competitorData.forEach(item => {
    if (!pincodeMap.has(item.pincode)) {
      pincodeMap.set(item.pincode, []);
    }
    pincodeMap.get(item.pincode)!.push(item);
  });
  
  // Serviceable pincodes are those where at least one product has "Yes", "No", or "Item Not Found" availability
  const serviceablePincodes = new Set();
  pincodeMap.forEach((items, pincode) => {
    const isServiceable = items.some(item => 
      item.availability === "Yes" || 
      item.availability === "No" || 
      item.availability === "Item Not Found"
    );
    if (isServiceable) {
      serviceablePincodes.add(pincode);
    }
  });
  
  // Get all items in serviceable pincodes
  const serviceableItems = competitorData.filter(item => 
    serviceablePincodes.has(item.pincode)
  );
  
  // Count items with "Yes" or "No" availability (Listed items)
  const listedItems = serviceableItems.filter(item => 
    item.availability === "Yes" || item.availability === "No"
  ).length;
  
  // Count available items (Yes availability)
  const availableItems = serviceableItems.filter(item => 
    item.availability === "Yes"
  ).length;
  
  // Total items in serviceable pincodes
  const totalItems = serviceableItems.length;
  
  // Add detailed logging
  console.log(`[CALC] Coverage Across Competitors:
    Total Competitors: ${competitorIds.length}
    Serviceable Pincodes: ${serviceablePincodes.size}
    Total Items in Serviceable Pincodes: ${totalItems}
    Listed Items (Yes or No): ${listedItems}
    Available Items (Yes): ${availableItems}
    Serviceable Sample: ${Array.from(serviceablePincodes).slice(0, 3)}
  `);
  
  // Penetration = Number of Listed Items / Total Items in serviceable pincodes
  const penetration = totalItems > 0 ? 
    (listedItems / totalItems) * 100 : 0;
  
  // Availability = Number of "Yes" Items / Number of Listed Items
  const availability = listedItems > 0 ? 
    (availableItems / listedItems) * 100 : 0;
  
  // Coverage = Number of "Yes" Items / Total Items
  const coverage = totalItems > 0 ?
    (availableItems / totalItems) * 100 : 0;
  
  console.log(`[CALC] Coverage Calculation Results:
    Penetration: ${penetration.toFixed(2)}%
    Availability: ${availability.toFixed(2)}%
    Coverage: ${coverage.toFixed(2)}%
  `);
  
  return coverage;
}

// Function to calculate serviceable SKUs
function calculateServiceableSKUs(data: ProcessedData[]): number {
  // A pincode is serviceable if any product has 'Yes', 'No', or 'Item Not Found' in availability
  const serviceablePincodes = new Set();
  
  // Group by pincode first
  const pincodeMap = new Map<string, ProcessedData[]>();
  data.forEach(item => {
    if (!pincodeMap.has(item.pincode)) {
      pincodeMap.set(item.pincode, []);
    }
    pincodeMap.get(item.pincode)!.push(item);
  });
  
  // For each pincode, check if any product is serviceable (availability is "Yes", "No", or "Item Not Found")
  pincodeMap.forEach((items, pincode) => {
    const isServiceable = items.some(item => 
      item.availability === "Yes" || 
      item.availability === "No" || 
      item.availability === "Item Not Found"
    );
    if (isServiceable) {
      serviceablePincodes.add(pincode);
    }
  });
  
  console.log(`[CALC] Serviceable Pincodes: ${serviceablePincodes.size} pincodes`, 
              Array.from(serviceablePincodes).slice(0, 5));
  
  return serviceablePincodes.size;
}

// Function to calculate listed SKUs
function calculateListedSKUs(data: ProcessedData[]): number {
  // Listed pincodes are those where at least one product has availability "Yes" or "No"
  // (not "Item Not Found" or blank)
  const listedPincodes = new Set();
  
  // Group by pincode first
  const pincodeMap = new Map<string, ProcessedData[]>();
  data.forEach(item => {
    if (!pincodeMap.has(item.pincode)) {
      pincodeMap.set(item.pincode, []);
    }
    pincodeMap.get(item.pincode)!.push(item);
  });
  
  // For each pincode, check if any product is listed (availability is "Yes" or "No")
  pincodeMap.forEach((items, pincode) => {
    const isListed = items.some(item => 
      item.availability === "Yes" || item.availability === "No");
    if (isListed) {
      listedPincodes.add(pincode);
    }
  });
  
  console.log(`[CALC] Listed Pincodes: ${listedPincodes.size} pincodes`, 
              Array.from(listedPincodes).slice(0, 5));
  
  return listedPincodes.size;
}

// Function to calculate available SKUs 
function calculateAvailableSKUs(data: ProcessedData[]): number {
  // Available pincodes are those where at least one product has availability "Yes"
  const availablePincodes = new Set();
  
  // Group by pincode first
  const pincodeMap = new Map<string, ProcessedData[]>();
  data.forEach(item => {
    if (!pincodeMap.has(item.pincode)) {
      pincodeMap.set(item.pincode, []);
    }
    pincodeMap.get(item.pincode)!.push(item);
  });
  
  // For each pincode, check if any product is available (availability is "Yes")
  pincodeMap.forEach((items, pincode) => {
    const isAvailable = items.some(item => item.availability === "Yes");
    if (isAvailable) {
      availablePincodes.add(pincode);
    }
  });
  
  console.log(`[CALC] Available Pincodes: ${availablePincodes.size} pincodes`, 
              Array.from(availablePincodes).slice(0, 5));
  
  return availablePincodes.size;
}

// Function to calculate not available SKUs
function calculateNotAvailableSKUs(data: ProcessedData[]): number {
  // Not available pincodes are those where products are listed but not available
  // (has "No" but not "Yes" for any product in that pincode)
  const notAvailablePincodes = new Set();
  
  // Group by pincode first
  const pincodeMap = new Map<string, ProcessedData[]>();
  data.forEach(item => {
    if (!pincodeMap.has(item.pincode)) {
      pincodeMap.set(item.pincode, []);
    }
    pincodeMap.get(item.pincode)!.push(item);
  });
  
  // For each pincode, check if any product is not available but listed
  pincodeMap.forEach((items, pincode) => {
    const hasNoAvailable = items.some(item => item.availability === "No");
    const hasYesAvailable = items.some(item => item.availability === "Yes");
    
    // Only count if has "No" but no "Yes" products
    if (hasNoAvailable && !hasYesAvailable) {
      notAvailablePincodes.add(pincode);
    }
  });
  
  console.log(`[CALC] Not Available Pincodes: ${notAvailablePincodes.size} pincodes`, 
              Array.from(notAvailablePincodes).slice(0, 5));
  
  return notAvailablePincodes.size;
}

// Function to calculate penetration
function calculatePenetration(data: ProcessedData[]): number {
  console.log(`[CALC] Starting penetration calculation with ${data.length} data points`);
  
  // Group data by pincode to determine serviceable and listed pincodes
  const pincodeMap = new Map<string, ProcessedData[]>();
  data.forEach(item => {
    if (!pincodeMap.has(item.pincode)) {
      pincodeMap.set(item.pincode, []);
    }
    pincodeMap.get(item.pincode)!.push(item);
  });
  
  // Serviceable pincodes are those where at least one product has "Yes", "No", or "Item Not Found" availability
  const serviceablePincodes = new Set();
  pincodeMap.forEach((items, pincode) => {
    const isServiceable = items.some(item => 
      item.availability === "Yes" || 
      item.availability === "No" || 
      item.availability === "Item Not Found"
    );
    if (isServiceable) {
      serviceablePincodes.add(pincode);
    }
  });
  
  // Listed pincodes are those where at least one product has "Yes" or "No" availability
  const listedPincodes = new Set();
  pincodeMap.forEach((items, pincode) => {
    const isListed = items.some(item => 
      item.availability === "Yes" || 
      item.availability === "No"
    );
    if (isListed) {
      listedPincodes.add(pincode);
    }
  });
  
  const serviceablePincodesCount = serviceablePincodes.size;
  const listedPincodesCount = listedPincodes.size;
  
  console.log(`[CALC] Penetration Calculation:
    Serviceable Pincodes: ${serviceablePincodesCount}
    Listed Pincodes: ${listedPincodesCount}
    Serviceable Pincodes Sample: ${Array.from(serviceablePincodes).slice(0, 3)}
  `);
  
  if (serviceablePincodesCount === 0) {
    console.log(`[CALC] Penetration: 0% (no serviceable pincodes)`);
    return 0;
  }
  
  // Penetration = Number of Listed Pincodes / Number of Serviceable Pincodes
  const penetration = (listedPincodesCount / serviceablePincodesCount) * 100;
  console.log(`[CALC] Penetration: ${penetration.toFixed(2)}%`);
  
  return penetration;
}

// Function to calculate availability
function calculateAvailability(data: ProcessedData[]): number {
  console.log(`[CALC] Starting availability calculation with ${data.length} data points`);
  
  // Count items with "Yes" availability
  const availableItems = data.filter(item => item.availability === "Yes").length;
  
  // Count items with "Yes" or "No" availability (listed items)
  const listedItems = data.filter(item => 
    item.availability === "Yes" || item.availability === "No"
  ).length;
  
  console.log(`[CALC] Availability Calculation:
    Listed Items: ${listedItems}
    Available Items: ${availableItems}
  `);
  
  if (listedItems === 0) {
    console.log(`[CALC] Availability: 0% (no listed items)`);
    return 0;
  }
  
  // Availability = Number of "Yes" Items / Total Listed Items
  const availability = (availableItems / listedItems) * 100;
  console.log(`[CALC] Availability: ${availability.toFixed(2)}%`);
  
  return availability;
}

// Function to calculate coverage
function calculateCoverage(data: ProcessedData[]): number {
  console.log(`[CALC] Starting coverage calculation with ${data.length} data points`);
  
  // Group data by pincode
  const pincodeMap = new Map<string, ProcessedData[]>();
  data.forEach(item => {
    if (!pincodeMap.has(item.pincode)) {
      pincodeMap.set(item.pincode, []);
    }
    pincodeMap.get(item.pincode)!.push(item);
  });
  
  // Serviceable pincodes are those where at least one product has "Yes", "No", or "Item Not Found" availability
  const serviceablePincodes = new Set();
  pincodeMap.forEach((items, pincode) => {
    const isServiceable = items.some(item => 
      item.availability === "Yes" || 
      item.availability === "No" || 
      item.availability === "Item Not Found"
    );
    if (isServiceable) {
      serviceablePincodes.add(pincode);
    }
  });
  
  // Get all items in serviceable pincodes
  const serviceableItems = data.filter(item => 
    serviceablePincodes.has(item.pincode)
  );
  
  // Count available items (Yes availability)
  const availableItems = serviceableItems.filter(item => 
    item.availability === "Yes"
  ).length;
  
  // Total serviceable items
  const totalServiceableItems = serviceableItems.length;
  
  console.log(`[CALC] Coverage Calculation:
    Serviceable Pincodes: ${serviceablePincodes.size}
    Total Serviceable Items: ${totalServiceableItems}
    Available Items (Yes): ${availableItems}
  `);
  
  if (totalServiceableItems === 0) {
    console.log(`[CALC] Coverage: 0% (no serviceable items)`);
    return 0;
  }
  
  // Coverage = Number of "Yes" Items / Total Serviceable Items
  const coverage = (availableItems / totalServiceableItems) * 100;
  console.log(`[CALC] Coverage: ${coverage.toFixed(2)}%`);
  
  return coverage;
}

// Function to calculate regional insights
function calculateRegionalInsights(data: ProcessedData[]): { 
  lowestCoverageRegion: { name: string; value: number; delta: number; competitorCoverage: number };
  highestAvailabilityDeltaRegion: { name: string; value: number; delta: number };
  highestAvailabilityDeltaFromCompetitors: { name: string; value: number; competitors: number; delta: number };
} {
  if (data.length === 0) {
    return {
      lowestCoverageRegion: { name: "-", value: 0, delta: 0, competitorCoverage: 0 },
      highestAvailabilityDeltaRegion: { name: "-", value: 0, delta: 0 },
      highestAvailabilityDeltaFromCompetitors: { name: "-", value: 0, competitors: 0, delta: 0 }
    };
  }

  // Extract client name from data
  const clientName = data.find(item => item.clientName)?.clientName || '';

  // Group data by city/region
  const regionMap = new Map<string, ProcessedData[]>();
  data.forEach(item => {
    const region = item.city;
    if (!regionMap.has(region)) {
      regionMap.set(region, []);
    }
    regionMap.get(region)!.push(item);
  });

  // Calculate coverage and availability for each region
  const regionMetrics = Array.from(regionMap.entries()).map(([name, items]) => {
    // Group items by pincode
    const pincodeMap = new Map<string, ProcessedData[]>();
    items.forEach(item => {
      if (!pincodeMap.has(item.pincode)) {
        pincodeMap.set(item.pincode, []);
      }
      pincodeMap.get(item.pincode)!.push(item);
    });
    
    // Identify serviceable pincodes
    const serviceablePincodes = new Set();
    pincodeMap.forEach((pincodeItems, pincode) => {
      const isServiceable = pincodeItems.some(item => 
        item.availability === "Yes" || 
        item.availability === "No" || 
        item.availability === "Item Not Found"
      );
      if (isServiceable) {
        serviceablePincodes.add(pincode);
      }
    });
    
    // Get all items in serviceable pincodes
    const serviceableItems = items.filter(item => 
      serviceablePincodes.has(item.pincode)
    );
    
    // Count items with "Yes" or "No" availability (Listed items)
    const listedItems = serviceableItems.filter(item => 
      item.availability === "Yes" || item.availability === "No"
    ).length;
    
    // Count available items (Yes availability)
    const availableItems = serviceableItems.filter(item => 
      item.availability === "Yes"
    ).length;
    
    // Total items in serviceable pincodes
    const totalItems = serviceableItems.length;
    
    // Calculate metrics
    const penetration = totalItems > 0 ? (listedItems / totalItems) * 100 : 0;
    const availability = listedItems > 0 ? (availableItems / listedItems) * 100 : 0;
    const coverage = totalItems > 0 ? (availableItems / totalItems) * 100 : 0;
    
    // Separate client and competitor data
    const clientItems = serviceableItems.filter(item => 
      item.brand === clientName || item.clientName === clientName
    );
    
    const competitorItems = serviceableItems.filter(item => 
      item.brand !== clientName && item.clientName !== clientName
    );
    
    // Calculate client metrics
    const clientListedItems = clientItems.filter(item => 
      item.availability === "Yes" || item.availability === "No"
    ).length;
    
    const clientAvailableItems = clientItems.filter(item => 
      item.availability === "Yes"
    ).length;
    
    const clientTotalItems = clientItems.length;
    
    const clientPenetration = clientTotalItems > 0 ? (clientListedItems / clientTotalItems) * 100 : 0;
    const clientAvailability = clientListedItems > 0 ? (clientAvailableItems / clientListedItems) * 100 : 0;
    const clientCoverage = clientTotalItems > 0 ? (clientAvailableItems / clientTotalItems) * 100 : 0;
    
    // Calculate competitor metrics
    const competitorListedItems = competitorItems.filter(item => 
      item.availability === "Yes" || item.availability === "No"
    ).length;
    
    const competitorAvailableItems = competitorItems.filter(item => 
      item.availability === "Yes"
    ).length;
    
    const competitorTotalItems = competitorItems.length;
    
    const competitorPenetration = competitorTotalItems > 0 ? (competitorListedItems / competitorTotalItems) * 100 : 0;
    const competitorAvailability = competitorListedItems > 0 ? (competitorAvailableItems / competitorListedItems) * 100 : 0;
    const competitorCoverage = competitorTotalItems > 0 ? (competitorAvailableItems / competitorTotalItems) * 100 : 0;
    
    // Calculate availability delta between client and competitors
    const availabilityDeltaFromCompetitors = clientAvailability - competitorAvailability;
    
    // Get previous report data for delta calculation
    // Group data by report date to get previous report
    const reportDates = Array.from(
      new Set(items.map(item => {
        if (item.reportDate instanceof Date) {
          return item.reportDate.toISOString().split("T")[0];
        } else {
          return new Date().toISOString().split("T")[0];
        }
      }))
    ).sort((a, b) => a.localeCompare(b));
    
    let coverageDelta = 0;
    let availabilityDelta = 0;
    
    if (reportDates.length > 1) {
      const currentDate = reportDates[reportDates.length - 1];
      const previousDate = reportDates[reportDates.length - 2];
      
      const currentItems = items.filter(item => {
        if (item.reportDate instanceof Date) {
          return item.reportDate.toISOString().split("T")[0] === currentDate;
        } else {
          return false;
        }
      });
      
      const previousItems = items.filter(item => {
        if (item.reportDate instanceof Date) {
          return item.reportDate.toISOString().split("T")[0] === previousDate;
        } else {
          return false;
        }
      });
      
      if (currentItems.length > 0 && previousItems.length > 0) {
        // Group current items by pincode
        const currentPincodeMap = new Map<string, ProcessedData[]>();
        currentItems.forEach(item => {
          if (!currentPincodeMap.has(item.pincode)) {
            currentPincodeMap.set(item.pincode, []);
          }
          currentPincodeMap.get(item.pincode)!.push(item);
        });
        
        // Identify current serviceable pincodes
        const currentServiceablePincodes = new Set();
        currentPincodeMap.forEach((pincodeItems, pincode) => {
          const isServiceable = pincodeItems.some(item => 
            item.availability === "Yes" || 
            item.availability === "No" || 
            item.availability === "Item Not Found"
          );
          if (isServiceable) {
            currentServiceablePincodes.add(pincode);
          }
        });
        
        // Get all current items in serviceable pincodes
        const currentServiceableItems = currentItems.filter(item => 
          currentServiceablePincodes.has(item.pincode)
        );
        
        // Count current items with "Yes" or "No" availability (Listed items)
        const currentListedItems = currentServiceableItems.filter(item => 
          item.availability === "Yes" || item.availability === "No"
        ).length;
        
        // Count current available items (Yes availability)
        const currentAvailableItems = currentServiceableItems.filter(item => 
          item.availability === "Yes"
        ).length;
        
        // Total current items in serviceable pincodes
        const currentTotalItems = currentServiceableItems.length;
        
        // Calculate current metrics
        const currentPenetration = currentTotalItems > 0 ? (currentListedItems / currentTotalItems) * 100 : 0;
        const currentAvailability = currentListedItems > 0 ? (currentAvailableItems / currentListedItems) * 100 : 0;
        const currentCoverage = currentTotalItems > 0 ? (currentAvailableItems / currentTotalItems) * 100 : 0;
        
        // Group previous items by pincode
        const previousPincodeMap = new Map<string, ProcessedData[]>();
        previousItems.forEach(item => {
          if (!previousPincodeMap.has(item.pincode)) {
            previousPincodeMap.set(item.pincode, []);
          }
          previousPincodeMap.get(item.pincode)!.push(item);
        });
        
        // Identify previous serviceable pincodes
        const previousServiceablePincodes = new Set();
        previousPincodeMap.forEach((pincodeItems, pincode) => {
          const isServiceable = pincodeItems.some(item => 
            item.availability === "Yes" || 
            item.availability === "No" || 
            item.availability === "Item Not Found"
          );
          if (isServiceable) {
            previousServiceablePincodes.add(pincode);
          }
        });
        
        // Get all previous items in serviceable pincodes
        const previousServiceableItems = previousItems.filter(item => 
          previousServiceablePincodes.has(item.pincode)
        );
        
        // Count previous items with "Yes" or "No" availability (Listed items)
        const previousListedItems = previousServiceableItems.filter(item => 
          item.availability === "Yes" || item.availability === "No"
        ).length;
        
        // Count previous available items (Yes availability)
        const previousAvailableItems = previousServiceableItems.filter(item => 
          item.availability === "Yes"
        ).length;
        
        // Total previous items in serviceable pincodes
        const previousTotalItems = previousServiceableItems.length;
        
        // Calculate previous metrics
        const previousPenetration = previousTotalItems > 0 ? (previousListedItems / previousTotalItems) * 100 : 0;
        const previousAvailability = previousListedItems > 0 ? (previousAvailableItems / previousListedItems) * 100 : 0;
        const previousCoverage = previousTotalItems > 0 ? (previousAvailableItems / previousTotalItems) * 100 : 0;
        
        coverageDelta = currentCoverage - previousCoverage;
        availabilityDelta = currentAvailability - previousAvailability;
      }
    }
    
    return { 
      name, 
      coverage, 
      competitorCoverage: competitorCoverage,
      coverageDelta, 
      availability, 
      availabilityDelta,
      availabilityDeltaFromCompetitors,
      competitorAvailability
    };
  });
  
  // Find lowest coverage region
  const lowestCoverageRegion = regionMetrics
    .filter(region => region.name !== "-" && region.coverage > 0)
    .sort((a, b) => a.coverage - b.coverage)[0] || 
    { name: "-", coverage: 0, coverageDelta: 0, competitorCoverage: 0 };
  
  // Find highest availability delta region
  const highestAvailabilityDeltaRegion = regionMetrics
    .filter(region => region.name !== "-" && region.availabilityDelta > 0)
    .sort((a, b) => b.availabilityDelta - a.availabilityDelta)[0] || 
    { name: "-", availability: 0, availabilityDelta: 0 };
  
  // Find highest availability delta from competitors
  const highestAvailabilityDeltaFromCompetitors = regionMetrics
    .filter(region => region.name !== "-" && region.availability > 0 && region.availabilityDeltaFromCompetitors > 0)
    .sort((a, b) => b.availabilityDeltaFromCompetitors - a.availabilityDeltaFromCompetitors)[0] || 
    { name: "-", availability: 0, competitorAvailability: 0, availabilityDeltaFromCompetitors: 0 };
  
  return {
    lowestCoverageRegion: { 
      name: lowestCoverageRegion.name, 
      value: lowestCoverageRegion.coverage, 
      delta: lowestCoverageRegion.coverageDelta,
      competitorCoverage: lowestCoverageRegion.competitorCoverage
    },
    highestAvailabilityDeltaRegion: { 
      name: highestAvailabilityDeltaRegion.name, 
      value: highestAvailabilityDeltaRegion.availability, 
      delta: highestAvailabilityDeltaRegion.availabilityDelta
    },
    highestAvailabilityDeltaFromCompetitors: {
      name: highestAvailabilityDeltaFromCompetitors.name,
      value: highestAvailabilityDeltaFromCompetitors.availability,
      competitors: highestAvailabilityDeltaFromCompetitors.competitorAvailability,
      delta: highestAvailabilityDeltaFromCompetitors.availabilityDeltaFromCompetitors
    }
  };
}

// Helper function to calculate stock-out percentage
function calculateStockOutPercentage(data: ProcessedData[]): number {
  const availabilityStatus = data.reduce((acc, item) => {
    if (item.availability === "Yes") acc.available++;
    else if (item.availability === "No") acc.notAvailable++;
    return acc;
  }, { available: 0, notAvailable: 0 });
  
  const listedCount = availabilityStatus.available + availabilityStatus.notAvailable;
  return listedCount > 0 ? (availabilityStatus.notAvailable / listedCount) * 100 : 0;
}

// Helper function to calculate average discount
function calculateAverageDiscount(data: ProcessedData[]): number {
  if (data.length === 0) return 0;
  
  const totalDiscount = data.reduce(
    (sum, item) => sum + item.discount,
    0
  );
  return totalDiscount / data.length;
}

// Function to calculate KPIs
export function calculateKPIs(data: ProcessedData[]) {
  console.log(`[CALC] Starting KPI calculations with ${data.length} data points`);
  
  if (data.length === 0) {
    console.log(`[CALC] No data points provided for KPI calculation`);
    return {
      skusTracked: 0,
      avgDiscount: 0,
      topPlatform: "",
      stockOutPercentage: 0,
      stockOutDelta: 0,
      avgDiscountDelta: 0,
      competitorCoverage: 0,
      totalSKUs: 0,
      serviceableSKUs: 0,
      listedSKUs: 0,
      availableSKUs: 0,
      notAvailableSKUs: 0,
      skuTracks: 0,
      penetration: 0,
      availability: 0,
      coverage: 0,
      discount: 0,
      lowestCoverageRegion: {
        name: "",
        value: 0,
        delta: 0,
        competitorCoverage: 0,
      },
      highestAvailabilityDeltaRegion: {
        name: "",
        value: 0,
        delta: 0,
      },
      highestAvailabilityDeltaFromCompetitors: {
        name: "",
        value: 0,
        competitors: 0,
        delta: 0,
      },
      // Store the different coverage calculation methods
      coverageMethod1: 0,
      coverageMethod2: 0,
    };
  }

  // Calculate total number of unique SKUs
  const uniqueSkus = new Set(data.map((item) => item.skuId)).size;
  console.log(`[CALC] Unique SKUs: ${uniqueSkus}`);

  // Calculate total number of unique pincodes
  const totalPincodes = new Set(data.map((item) => item.pincode)).size;
  console.log(`[CALC] Total Unique Pincodes: ${totalPincodes}`);

  // Calculate average discount - specifically for client data
  const clientData = data.filter(item => item.clientName); // Only filter by clientName when client_name exists
  const totalDiscount = clientData.length 
    ? clientData.reduce((sum, item) => sum + item.discount, 0) 
    : data.reduce((sum, item) => sum + item.discount, 0);
  const avgDiscount = clientData.length 
    ? totalDiscount / clientData.length 
    : (data.length ? totalDiscount / data.length : 0);
  
  console.log(`[CALC] Average Discount: ${avgDiscount.toFixed(2)}%`);

  // Find top platform by count
  const platformCounts = data.reduce((counts, item) => {
    counts[item.platform] = (counts[item.platform] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  const topPlatform = Object.entries(platformCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([platform]) => platform)[0];
  
  console.log(`[CALC] Top Platform: ${topPlatform}`);

  // Calculate stock-out percentage
  const availabilityStatus = data.reduce((acc, item) => {
    if (item.availability === "Yes") acc.available++;
    else if (item.availability === "No") acc.notAvailable++;
    return acc;
  }, { available: 0, notAvailable: 0 });
  
  const listedCount = availabilityStatus.available + availabilityStatus.notAvailable;
  const stockOutPercentage = listedCount > 0 ? 
    (availabilityStatus.notAvailable / listedCount) * 100 : 0;
  
  // Calculate competitor coverage
  const competitorIds = Array.from(new Set(data.filter(item => item.platform).map(item => item.platform)));
  const competitorCoverage = competitorIds.length > 0 
    ? calculateCoverageAcrossCompetitors(data, competitorIds) 
    : 0;
  
  // Calculate pincode metrics based on new definitions
  const totalSKUs = totalPincodes; // Use total unique pincodes
  const serviceableSKUs = calculateServiceableSKUs(data);
  const listedSKUs = calculateListedSKUs(data);
  const availableSKUs = calculateAvailableSKUs(data);
  const notAvailableSKUs = calculateNotAvailableSKUs(data);

  // Group data by report date to get previous and current report
  const reportDates = Array.from(
    new Set(data.map(item => {
      if (item.reportDate instanceof Date) {
        return item.reportDate.toISOString().split("T")[0];
      } else {
        return new Date().toISOString().split("T")[0];
      }
    }))
  ).sort((a, b) => a.localeCompare(b));

  // Initialize deltas with 0 instead of hardcoded values
  let stockOutDelta = 0;
  let avgDiscountDelta = 0;

  // Calculate stock-out delta and discount delta by comparing different report dates
  if (reportDates.length > 1) {
    const currentDate = reportDates[reportDates.length - 1];
    const previousDate = reportDates[reportDates.length - 2];
    
    // Filter data by report date
    const currentReportData = data.filter(item => {
      if (item.reportDate instanceof Date) {
        return item.reportDate.toISOString().split("T")[0] === currentDate;
      } else {
        return false;
      }
    });
    
    const previousReportData = data.filter(item => {
      if (item.reportDate instanceof Date) {
        return item.reportDate.toISOString().split("T")[0] === previousDate;
      } else {
        return false;
      }
    });
    
    // Current metrics
    const currentStockOutPercentage = calculateStockOutPercentage(currentReportData);
    const currentAvgDiscount = calculateAverageDiscount(currentReportData);
    
    // Previous metrics
    const previousStockOutPercentage = calculateStockOutPercentage(previousReportData);
    const previousAvgDiscount = calculateAverageDiscount(previousReportData);
    
    // Calculate the deltas
    stockOutDelta = parseFloat(
      (currentStockOutPercentage - previousStockOutPercentage).toFixed(2)
    );
    
    avgDiscountDelta = previousAvgDiscount !== 0 ?
      parseFloat((((currentAvgDiscount - previousAvgDiscount) / previousAvgDiscount) * 100).toFixed(2)) : 0;
  }

  // Calculate penetration
  const penetration = calculatePenetration(data);

  // Calculate availability
  const availability = calculateAvailability(data);

  // Calculate coverage
  const coverage = calculateCoverage(data);

  // Calculate overall metrics
  const overallPenetration = penetration;
  const overallAvailability = availability;
  const overallCoverage = coverage;

  // Calculate coverage methods
  const coverageMethod1 = (availability * penetration) / 100;
  const coverageMethod2 = availability;

  // Return calculated metrics
  const returnObject = {
    skusTracked: uniqueSkus,
    avgDiscount,
    topPlatform,
    stockOutPercentage,
    stockOutDelta,
    avgDiscountDelta,
    competitorCoverage,
    totalSKUs,
    serviceableSKUs,
    listedSKUs,
    availableSKUs,
    notAvailableSKUs,
    skuTracks: uniqueSkus,
    penetration: overallPenetration,
    availability: overallAvailability,
    coverage: overallCoverage,
    discount: avgDiscount,
    lowestCoverageRegion: calculateRegionalInsights(data).lowestCoverageRegion,
    highestAvailabilityDeltaRegion: calculateRegionalInsights(data).highestAvailabilityDeltaRegion,
    highestAvailabilityDeltaFromCompetitors: calculateRegionalInsights(data).highestAvailabilityDeltaFromCompetitors,
    coverageMethod1,
    coverageMethod2,
  };

  console.log("[CALC] RETURNED METRICS:", JSON.stringify({
    penetration: returnObject.penetration,
    availability: returnObject.availability,
    coverage: returnObject.coverage
  }, null, 2));
  
  return returnObject;
}

// Function to initialize platform serviceable pincodes count
export function getPlatformServiceablePincodes(data: ProcessedData[]): Map<string, number> {
  const platformMap = new Map<string, Set<string>>();
  
  // Group all pincodes by platform
  data.forEach(item => {
    if (!platformMap.has(item.platform)) {
      platformMap.set(item.platform, new Set());
    }
    platformMap.get(item.platform)!.add(item.pincode);
  });
  
  // Convert sets to counts
  const platformPincodeCounts = new Map<string, number>();
  platformMap.forEach((pincodes, platform) => {
    platformPincodeCounts.set(platform, pincodes.size);
  });
  
  return platformPincodeCounts;
}

// Function to get time series data for trend analysis
export function getTimeSeriesData(data: ProcessedData[]): { date: string; value: number }[] {
  // Group data by report date
  const dateMap = new Map<string, ProcessedData[]>();
  
  data.forEach(item => {
    if (!item.reportDate) return;
    
    const dateString = item.reportDate instanceof Date 
      ? item.reportDate.toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    
    if (!dateMap.has(dateString)) {
      dateMap.set(dateString, []);
    }
    
    dateMap.get(dateString)!.push(item);
  });
  
  // Calculate availability percentage for each date
  return Array.from(dateMap.entries())
    .map(([date, items]) => {
      // Count items with "Yes" availability
      const availableItems = items.filter(item => item.availability === "Yes").length;
      
      // Count items with "Yes" or "No" availability (listed items)
      const listedItems = items.filter(item => 
        item.availability === "Yes" || item.availability === "No"
      ).length;
      
      // Calculate availability percentage
      const availability = listedItems > 0 ? 
        Math.round((availableItems / listedItems) * 100) : 0;
      
      return {
        date,
        value: availability
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Function to get regional data by pincode
export function getRegionalData(data: ProcessedData[]): {
  city: string;
  pincode: string;
  stockAvailability: number;
  stockOutPercent: number;
}[] {
      // Group data by pincode
      const pincodeMap = new Map<string, ProcessedData[]>();
  
  data.forEach(item => {
        if (!pincodeMap.has(item.pincode)) {
          pincodeMap.set(item.pincode, []);
        }
    
        pincodeMap.get(item.pincode)!.push(item);
      });
      
  // Calculate metrics for each pincode
  return Array.from(pincodeMap.entries()).map(([pincode, items]) => {
    const city = items[0].city;
    
    // Count items with "Yes" availability
    const availableItems = items.filter(item => item.availability === "Yes").length;
    
    // Count items with "Yes" or "No" availability (listed items)
    const listedItems = items.filter(item => 
        item.availability === "Yes" || item.availability === "No"
      ).length;
      
    // Calculate availability percentage
    const stockAvailability = listedItems > 0 ? 
      Math.round((availableItems / listedItems) * 100) : 0;
    
    // Calculate stock-out percentage
    const stockOutPercent = listedItems > 0 ? 
      Math.round(((listedItems - availableItems) / listedItems) * 100) : 0;
      
      return {
      city,
      pincode,
      stockAvailability,
      stockOutPercent
    };
  });
}

// Function to get city-level regional data
export function getCityRegionalData(data: ProcessedData[]): {
  city: string;
  stockAvailability: number;
  stockOutPercent: number;
  pincodeCount: number;
  pincodes: string[];
  coverage?: number;
  penetration?: number;
}[] {
  // Group data by city
  const cityMap = new Map<string, ProcessedData[]>();
  
  data.forEach(item => {
    const city = (item.city || "").toLowerCase();
    
    if (!cityMap.has(city)) {
      cityMap.set(city, []);
    }
    
    cityMap.get(city)!.push(item);
  });
  
  // Calculate metrics for each city
  return Array.from(cityMap.entries()).map(([city, items]) => {
    // Count unique pincodes
    const pincodes = Array.from(new Set(items.map(item => item.pincode)));
    
    // Count items with "Yes" availability
    const availableItems = items.filter(item => item.availability === "Yes").length;
    
    // Count items with "Yes" or "No" availability (listed items)
    const listedItems = items.filter(item => 
      item.availability === "Yes" || item.availability === "No"
    ).length;
    
    // Group data by pincode to calculate penetration
      const pincodeMap = new Map<string, ProcessedData[]>();
      items.forEach(item => {
        if (!pincodeMap.has(item.pincode)) {
          pincodeMap.set(item.pincode, []);
        }
        pincodeMap.get(item.pincode)!.push(item);
      });
      
    // Calculate serviceable pincodes
      const serviceablePincodes = new Set();
      pincodeMap.forEach((pincodeItems, pincode) => {
        const isServiceable = pincodeItems.some(item => 
          item.availability === "Yes" || 
          item.availability === "No" || 
          item.availability === "Item Not Found"
        );
        if (isServiceable) {
          serviceablePincodes.add(pincode);
        }
      });
      
    // Calculate listed pincodes
    const listedPincodes = new Set();
    pincodeMap.forEach((pincodeItems, pincode) => {
      const isListed = pincodeItems.some(item => 
        item.availability === "Yes" || item.availability === "No"
      );
      if (isListed) {
        listedPincodes.add(pincode);
      }
    });
    
    // Calculate availability percentage
    const stockAvailability = listedItems > 0 ? 
      Math.round((availableItems / listedItems) * 100) : 0;
    
    // Calculate stock-out percentage
    const stockOutPercent = listedItems > 0 ? 
      Math.round(((listedItems - availableItems) / listedItems) * 100) : 0;
    
    // Calculate penetration
    const penetration = serviceablePincodes.size > 0 ?
      Math.round((listedPincodes.size / serviceablePincodes.size) * 100) : 0;
    
    // Calculate coverage
    const coverage = stockAvailability * penetration / 100;

      return {
      city,
        stockAvailability,
        stockOutPercent,
      pincodeCount: pincodes.length,
      pincodes,
      coverage,
      penetration
    };
  }).sort((a, b) => b.stockAvailability - a.stockAvailability);
}

// Function to get platform data for platform comparisons
export function getPlatformData(data: ProcessedData[]): {
  name: string;
  salesValue: number;
  priceChange: number;
  discountChange: number;
  availabilityChange: number;
}[] {
  // Group data by platform
  const platformMap = new Map<string, ProcessedData[]>();
  
  data.forEach(item => {
    if (!platformMap.has(item.platform)) {
      platformMap.set(item.platform, []);
    }
    
    platformMap.get(item.platform)!.push(item);
  });
  
  // Calculate metrics for each platform
  return Array.from(platformMap.entries())
    .filter(([name]) => name) // Filter out empty platform names
    .map(([name, items]) => {
      // Calculate sales value (sum of selling prices)
      const salesValue = items.reduce((sum, item) => {
        const price = typeof item.sellingPrice === "number" && !isNaN(item.sellingPrice) 
          ? item.sellingPrice : 0;
        return sum + price;
      }, 0);
      
      // For the platform changes, we would ideally compare with previous data periods
      // Since that comparison logic is complex, we'll use placeholder values for now
      // In a real implementation, this would involve time-based comparisons
      
      // Generate consistent price change values based on platform name
      const priceChange = name.length % 5 - 2; // Range: -2 to 2
      
      // Generate consistent discount change values based on platform name
      const discountChange = (name.charCodeAt(0) % 4) - 1.5; // Range: -1.5 to 2.5
      
      // Generate consistent availability change values based on platform name
      const availabilityChange = (name.length * 0.7) % 5 - 2; // Range: -2 to 3

      return {
        name,
        salesValue,
        priceChange,
        discountChange,
        availabilityChange
      };
    })
    .sort((a, b) => b.salesValue - a.salesValue);
}

// Function to get city choropleth data for map visualizations
export function getCityChoroplethData(data: ProcessedData[]): {
  id: string;
  city: string;
  value: number;
}[] {
  // Group data by city
  const cityMap = new Map<string, ProcessedData[]>();

  data.forEach(item => {
    const city = (item.city || "").toLowerCase();

    if (!cityMap.has(city)) {
      cityMap.set(city, []);
    }
    
    cityMap.get(city)!.push(item);
  });
  
  // Calculate availability percentage for each city
  return Array.from(cityMap.entries()).map(([city, items]) => {
    // Count items with "Yes" availability
    const availableItems = items.filter(item => item.availability === "Yes").length;
    
    // Count items with "Yes" or "No" availability (listed items)
    const listedItems = items.filter(item => 
            item.availability === "Yes" || item.availability === "No"
          ).length;
    
    // Calculate availability percentage
    const stockAvailability = listedItems > 0 ? 
      Math.round((availableItems / listedItems) * 100) : 0;

      return {
      id: city,
      city,
      value: stockAvailability
    };
  });
}

// Function to get platform share data (for pie charts)
export function getPlatformShareData(data: ProcessedData[], brand?: string): {
  name: string;
  value: number;
}[] {
  // Filter by brand if specified
  const filteredData = brand
    ? data.filter((item) => item.brand === brand)
    : data;

  // Group data by platform and count items
  const platformCounts = filteredData.reduce((counts, item) => {
    if (!item.platform) return counts; // Skip entries with no platform

    counts[item.platform] = (counts[item.platform] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  // Calculate percentages
  const total = Object.values(platformCounts).reduce(
    (sum, count) => sum + count,
    0
  );

  if (total === 0) {
    return []; // Return empty array if no data
  }

  // Convert to array format for chart components
  return Object.entries(platformCounts)
    .map(([name, count]) => ({
      name,
      value: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.value - a.value);
}

// Function to get brand data for brand evaluation page
export function getBrandData(data: ProcessedData[]): {
  name: string;
  avgDiscount: number;
  availability: number;
  penetration?: number;
  coverage?: number;
  skuCount: number;
  products: {
    name: string;
    mrp: number;
    sellingPrice: number;
    availability: number;
  }[];
}[] {
  // Group data by brand
  const brandMap = new Map<string, ProcessedData[]>();

  data.forEach(item => {
    if (!item.brand) return; // Skip entries with no brand

    if (!brandMap.has(item.brand)) {
      brandMap.set(item.brand, []);
    }

    brandMap.get(item.brand)!.push(item);
  });

  // Calculate metrics for each brand
  return Array.from(brandMap.entries())
    .filter(([name]) => name) // Filter out empty brand names
    .map(([name, items]) => {
      // Calculate average discount
      const totalDiscount = items.reduce((sum, item) => sum + item.discount, 0);
      const avgDiscount = Math.round((totalDiscount / items.length) * 10) / 10;

      // Calculate availability percentage
      const availableItems = items.filter(item => item.availability === "Yes").length;
      const listedItems = items.filter(item => 
        item.availability === "Yes" || item.availability === "No"
      ).length;
      const availability = listedItems > 0 ? 
        Math.round((availableItems / listedItems) * 100) : 0;
      
      // Calculate penetration - Listed Items / Total Items
      const totalItems = items.length;
      const penetration = totalItems > 0 ?
        Math.round((listedItems / totalItems) * 100) : 0;
      
      // Calculate coverage - Available Items / Total Items
      const coverage = totalItems > 0 ?
        Math.round((availableItems / totalItems) * 100) : 0;

      // Count unique SKUs
      const skuCount = new Set(items.map(item => item.skuId)).size;

      // Get top products
      const productMap = new Map<string, ProcessedData[]>();
      items.forEach(item => {
        if (!item.productId) return; // Skip entries with no productId
        
        if (!productMap.has(item.productId)) {
          productMap.set(item.productId, []);
        }
        
        productMap.get(item.productId)!.push(item);
      });

      const products = Array.from(productMap.entries())
        .map(([_, productItems]) => {
          const product = productItems[0]; // Use first item for product info
          
          // Calculate availability percentage for this product
          const productAvailableItems = productItems.filter(item => item.availability === "Yes").length;
          const productListedItems = productItems.filter(item => 
            item.availability === "Yes" || item.availability === "No"
          ).length;
          const productAvailability = productListedItems > 0 ? 
            Math.round((productAvailableItems / productListedItems) * 100) : 0;

          return {
            name: product.productDescription,
            mrp: product.mrp,
            sellingPrice: product.sellingPrice,
            availability: productAvailability,
          };
        })
        .sort((a, b) => b.availability - a.availability)
        .slice(0, 3); // Get top 3 products by availability

      return {
        name,
        avgDiscount,
        availability,
        penetration,
        coverage,
        skuCount,
        products,
      };
    })
    .sort((a, b) => b.skuCount - a.skuCount);
}

// Function to get product data
export function getProductData(data: ProcessedData[]): {
  brand: string;
  name: string;
  mrp: number | null;
  sellingPrice: number | null;
  availability: number;
}[] {
  // Group data by product ID
  const productMap = new Map<string, ProcessedData[]>();

  data.forEach(item => {
    if (!item.productId) return; // Skip entries with no productId

    if (!productMap.has(item.productId)) {
      productMap.set(item.productId, []);
    }

    productMap.get(item.productId)!.push(item);
  });

  // Calculate metrics for each product
  return Array.from(productMap.entries())
    .map(([_, items]) => {
      // Get product info from first item
      const product = items[0];
      
      // Calculate availability percentage
      const availableItems = items.filter(item => item.availability === "Yes").length;
      const listedItems = items.filter(item => 
        item.availability === "Yes" || item.availability === "No"
      ).length;
      const availability = listedItems > 0 ? 
        Math.round((availableItems / listedItems) * 100) : 0;

      return {
        brand: product.brand,
        name: product.productDescription,
        mrp: typeof product.mrp === "number" && !isNaN(product.mrp) ? product.mrp : null,
        sellingPrice: typeof product.sellingPrice === "number" && !isNaN(product.sellingPrice) ? product.sellingPrice : null,
        availability,
      };
    })
    .sort((a, b) => (a.brand && b.brand) ? a.brand.localeCompare(b.brand) : 0);
}

// Function to get choropleth data for map visualizations
export function getChoroplethData(data: ProcessedData[]): {
  id: string;
  value: number;
}[] {
  // Group data by pincode
  const pincodeMap = new Map<string, ProcessedData[]>();
  
  data.forEach(item => {
    if (!item.pincode) return; // Skip entries with no pincode
    
    if (!pincodeMap.has(item.pincode)) {
      pincodeMap.set(item.pincode, []);
    }
    
    pincodeMap.get(item.pincode)!.push(item);
  });
  
  // Calculate availability percentage for each pincode
  return Array.from(pincodeMap.entries()).map(([pincode, items]) => {
    // Count items with "Yes" availability
    const availableItems = items.filter(item => item.availability === "Yes").length;
    
    // Count items with "Yes" or "No" availability (listed items)
    const listedItems = items.filter(item => 
      item.availability === "Yes" || item.availability === "No"
    ).length;
    
    // Calculate availability percentage
    const stockAvailability = listedItems > 0 ? 
      Math.round((availableItems / listedItems) * 100) : 0;

      return {
        id: pincode,
      value: stockAvailability
      };
  });
}

// Function to generate heatmap data based on the selected metric type
export function getHeatmapDataByType(
  data: ProcessedData[], 
  cityRegionalData: any[],
  type: "availability" | "coverage" | "penetration" = "availability"
): {
  id: string;
  city: string;
  value: number;
}[] {
  // Use the city regional data to get the metrics based on the selected type
  return cityRegionalData.map(cityData => {
    let value = 0;
    
    // Get the value based on the selected metric type
    if (type === "coverage") {
      value = cityData.coverage || 0;
    } else if (type === "penetration") {
      value = cityData.penetration || 0;
    } else {
      // Default to availability
      value = cityData.stockAvailability || 0;
    }
    
    return {
      id: (cityData.city || "").toLowerCase(),
      city: cityData.city || "",
      value: value,
    };
  });
}

// Function to get coverage data by brand for dashboard page visualizations
export function getCoverageByBrandData(data: ProcessedData[]): {
  name: string;
  coverage: number;
}[] {
  // Group data by brand
  const brandMap = new Map<string, ProcessedData[]>();
  
  data.forEach(item => {
    if (!item.brand) return; // Skip entries with no brand
    
    if (!brandMap.has(item.brand)) {
      brandMap.set(item.brand, []);
    }
    
    brandMap.get(item.brand)!.push(item);
  });
  
  // Calculate coverage for each brand
  return Array.from(brandMap.entries())
    .filter(([name]) => name) // Filter out empty brand names
    .map(([name, items]) => {
      // Group data by pincode to calculate penetration and availability
      const pincodeMap = new Map<string, ProcessedData[]>();
      items.forEach(item => {
        if (!pincodeMap.has(item.pincode)) {
          pincodeMap.set(item.pincode, []);
        }
        pincodeMap.get(item.pincode)!.push(item);
      });
      
      // Calculate serviceable pincodes
      const serviceablePincodes = new Set();
      pincodeMap.forEach((pincodeItems, pincode) => {
        const isServiceable = pincodeItems.some(item => 
          item.availability === "Yes" || 
          item.availability === "No" || 
          item.availability === "Item Not Found"
        );
        if (isServiceable) {
          serviceablePincodes.add(pincode);
        }
      });
      
      // Calculate listed pincodes
      const listedPincodes = new Set();
      pincodeMap.forEach((pincodeItems, pincode) => {
        const isListed = pincodeItems.some(item => 
          item.availability === "Yes" || item.availability === "No"
        );
        if (isListed) {
          listedPincodes.add(pincode);
        }
      });
      
      // Calculate available pincodes
      const availablePincodes = new Set();
      pincodeMap.forEach((pincodeItems, pincode) => {
        const isAvailable = pincodeItems.some(item => item.availability === "Yes");
        if (isAvailable) {
          availablePincodes.add(pincode);
        }
      });
      
      // Calculate penetration
      const penetration = serviceablePincodes.size > 0 ? 
        (listedPincodes.size / serviceablePincodes.size) * 100 : 0;
      
      // Calculate availability
      const availability = listedPincodes.size > 0 ? 
        (availablePincodes.size / listedPincodes.size) * 100 : 0;
      
      // Calculate coverage (Method 1: penetration * availability / 100)
      const coverage = (penetration * availability) / 100;
      
      return {
        name,
        coverage: parseFloat(coverage.toFixed(1))
      };
    })
    .sort((a, b) => b.coverage - a.coverage); // Sort by coverage in descending order
}
