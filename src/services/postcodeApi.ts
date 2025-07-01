// Postcode.nl API client via server API route

interface PostcodeResponse {
  street?: string;
  city?: string;
  municipality?: string;
  province?: string;
  houseNumber?: string;
  houseNumberAddition?: string;
  postcode?: string;
  exceptionId?: string;
  message?: string;
}

/**
 * Cleans the postcode by removing spaces and making it uppercase
 */
export function cleanPostcode(postcode: string): string {
  return postcode.replace(/\s+|-/g, '').toUpperCase().trim();
}

/**
 * Fetches address information via our server API route that connects to Postcode.nl
 */
export async function fetchAddress(postcode: string, houseNumber: string, addition: string = ''): Promise<PostcodeResponse> {
  try {
    // Clean the postcode
    const cleanedPostcode = cleanPostcode(postcode);
    
    // Client-side validation before sending to the API
    if (!/^[1-9][0-9]{3}\s?[A-Za-z]{2}$/.test(cleanedPostcode)) {
      return { 
        exceptionId: 'PostcodeNl_Controller_Address_InvalidPostcodeException',
        message: 'Ongeldige postcode formaat'
      };
    }
    
    if (!/^\d+$/.test(houseNumber)) {
      return { 
        exceptionId: 'PostcodeNl_Controller_Address_InvalidHouseNumberException',
        message: 'Ongeldig huisnummer'
      };
    }
    
    // Construct the URL to our API route
    const params = new URLSearchParams({
      postcode: cleanedPostcode,
      houseNumber: houseNumber
    });
    
    if (addition) {
      params.append('addition', addition);
    }
    
    const url = `/api/postcode?${params.toString()}`;
    
    // Call our API route
    const response = await fetch(url);
    
    // Handle non-OK responses
    if (!response.ok) {
      const errorData = await response.json();
      return { 
        exceptionId: errorData.exceptionId || 'UnknownError',
        message: errorData.message || 'Er is een fout opgetreden'
      };
    }
    
    // Return the data from our API
    return await response.json();
    
  } catch (error) {
    console.error('Error fetching address:', error);
    return { 
      exceptionId: 'ClientError',
      message: 'Er is een fout opgetreden bij het ophalen van het adres'
    };
  }
}

/**
 * Check if an area has available space for a new Wasgeurtje retailer
 * This is a simulated function that always returns true for demo purposes
 */
export async function checkAreaAvailability(postcode: string): Promise<{available: boolean, message: string}> {
  // Simulate a network delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Always return success for demo purposes
  return {
    available: true,
    message: "Gefeliciteerd! Er is nog ruimte beschikbaar in uw regio."
  };
} 