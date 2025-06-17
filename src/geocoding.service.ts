import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

@Injectable()
export class GeocodingService {
    private apiKey: string;

    constructor(private configService: ConfigService) {
        // Get the API key from environment variables using ConfigService
        const key = this.configService.get<string>('GOOGLE_MAPS_API_KEY');
        if (!key) {
            throw new Error('GOOGLE_MAPS_API_KEY is not defined in the environment variables');
        }
        this.apiKey = key; // save API key for later use
    }

    async geocodeAddress(address: string) {
        try {
            const url = `https://maps.googleapis.com/maps/api/geocode/json`; // Google Geocoding API URL
            const response = await axios.get(url, {
                params: {
                    address,      // address string to geocode
                    key: this.apiKey,  // your Google API key
                },
            });

            const results = response.data.results;  // results array from the API

            // If no results, throw a 404 error
            if (!results || results.length === 0) {
                throw new HttpException('Address not found', HttpStatus.NOT_FOUND);
            }

            // Extract location data (latitude and longitude) from the first result
            const location = results[0].geometry.location;

            // Extract detailed address components (like country, city, postal code)
            const components = results[0].address_components;

            // Find country code (like 'US', 'IN')
            const countryCode = components.find(c => c.types.includes('country'))?.short_name;

            // Find country full name (like 'United States', 'India')
            const country = components.find(c => c.types.includes('country'))?.long_name || '';

            // Find postal code (zip code), empty string if not found
            const zipCode = components.find(c => c.types.includes('postal_code'))?.long_name || '';

            // Find city or fallback to state if city not available
            const city = components.find(c => c.types.includes('locality'))?.long_name 
                        || components.find(c => c.types.includes('administrative_area_level_1'))?.long_name;

            // Return all extracted info in one object
            return {
                latitude: location.lat,
                longitude: location.lng,
                address: results[0].formatted_address,
                country,
                countryCode,
                zipCode,
                city,
            };
        } catch (error) {
            throw new HttpException('Failed to fetch geocode data', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
