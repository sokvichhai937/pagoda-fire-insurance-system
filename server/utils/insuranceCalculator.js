// insuranceCalculator.js - Insurance premium calculation logic
// ឡូជីគណនាបុព្វលាភធានារ៉ាប់រង

/**
 * គណនាបុព្វលាភធានារ៉ាប់រង
 * Calculate insurance premium based on pagoda size, buildings, and age factor
 * 
 * @param {Object} pagodaData - Pagoda information
 * @param {Array} buildings - List of buildings at the pagoda
 * @returns {Object} Premium calculation result with breakdown
 */
function calculatePremium(pagodaData, buildings = []) {
  try {
    // ត្រួតពិនិត្យទិន្នន័យចូល
    // Validate input data
    if (!pagodaData) {
      throw new Error('Pagoda data is required');
    }

    // តម្លៃមូលដ្ឋានតាមទំហំវត្ត
    // Base premium by pagoda size
    const sizePremiums = {
      small: 200,    // វត្តតូច - Small pagoda
      medium: 500,   // វត្តមធ្យម - Medium pagoda  
      large: 1000    // វត្តធំ - Large pagoda
    };

    const pagodaSize = pagodaData.size ? pagodaData.size.toLowerCase() : 'medium';
    const basePremium = sizePremiums[pagodaSize] || sizePremiums.medium;

    // តម្លៃបុព្វលាភអាគារ
    // Building premiums
    const buildingPremiums = {
      main_temple: 300,      // វិហារធម៌ - Main temple
      chanting_hall: 150,    // សាលាសូត្រ - Chanting hall
      residence: 100,        // កុដិ - Monk residence
      other: 80              // អាគារផ្សេងៗ - Other buildings
    };

    let buildingPremium = 0;
    const buildingDetails = [];

    // គណនាតម្លៃសម្រាប់អាគារនីមួយៗ
    // Calculate premium for each building
    if (buildings && Array.isArray(buildings)) {
      buildings.forEach(building => {
        const buildingType = building.building_type || building.type || 'other';
        const premium = buildingPremiums[buildingType] || buildingPremiums.other;
        buildingPremium += premium;
        
        buildingDetails.push({
          name: building.building_name || building.name || 'Unknown Building',
          type: buildingType,
          premium: premium
        });
      });
    }

    // កត្តាអាយុ (សម្រាប់អាគារចាស់)
    // Age factor for older buildings
    let ageFactor = 1.0;
    const currentYear = new Date().getFullYear();
    
    if (pagodaData.year_built) {
      const age = currentYear - parseInt(pagodaData.year_built);
      
      // បង្កើនបុព្វលាភសម្រាប់អាគារចាស់ជាង ៥០ ឆ្នាំ
      // Increase premium for buildings older than 50 years
      if (age > 50) {
        ageFactor = 1.2; // បង្កើន 20% - 20% increase
      } else if (age > 30) {
        ageFactor = 1.1; // បង្កើន 10% - 10% increase
      }
    }

    // គណនាបុព្វលាភសរុប
    // Calculate total premium
    const subtotal = basePremium + buildingPremium;
    const totalPremium = Math.round(subtotal * ageFactor);

    // ការបែងចែកលម្អិត
    // Detailed breakdown
    return {
      totalPremium: totalPremium,
      breakdown: {
        basePremium: basePremium,
        buildingPremium: buildingPremium,
        subtotal: subtotal,
        factors: {
          ageFactor: ageFactor,
          ageIncrease: Math.round(subtotal * (ageFactor - 1))
        }
      },
      details: buildingDetails,
      metadata: {
        pagodaSize: pagodaSize,
        numberOfBuildings: buildings ? buildings.length : 0,
        yearBuilt: pagodaData.year_built || null,
        calculatedAt: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('Error calculating premium:', error);
    throw new Error(`Premium calculation failed: ${error.message}`);
  }
}

/**
 * គណនាការបញ្ចុះតម្លៃសម្រាប់ការបង់ប្រចាំឆ្នាំ
 * Calculate discount for annual payment
 * 
 * @param {number} monthlyPremium - Monthly premium amount
 * @returns {Object} Annual premium with discount
 */
function calculateAnnualDiscount(monthlyPremium) {
  const discountRate = 0.1; // បញ្ចុះ 10% - 10% discount
  const annualPremium = monthlyPremium * 12;
  const discountAmount = Math.round(annualPremium * discountRate);
  const finalAmount = annualPremium - discountAmount;

  return {
    monthlyPremium: monthlyPremium,
    annualPremium: annualPremium,
    discountRate: discountRate,
    discountAmount: discountAmount,
    finalAmount: finalAmount,
    savings: discountAmount
  };
}

/**
 * ពិនិត្យតម្លៃបុព្វលាភថាស្ថិតក្នុងដែនកំណត់
 * Validate premium is within acceptable range
 * 
 * @param {number} premium - Premium amount to validate
 * @returns {boolean} Whether premium is valid
 */
function validatePremium(premium) {
  const MIN_PREMIUM = 100;
  const MAX_PREMIUM = 50000;
  
  return premium >= MIN_PREMIUM && premium <= MAX_PREMIUM;
}

module.exports = {
  calculatePremium,
  calculateAnnualDiscount,
  validatePremium
};
