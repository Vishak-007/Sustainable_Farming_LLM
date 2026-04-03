import axios from 'axios';

export async function getWeather(lat, lon) {
    const OPENWEATHER_KEY = process.env.OPENWEATHER_API_KEY;

    if (!OPENWEATHER_KEY) {
        throw new Error('OPENWEATHER_API_KEY is not defined in environment variables');
    }

    try {
        const [currentRes, forecastRes] = await Promise.all([
            axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_KEY}&units=metric`),
            axios.get(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_KEY}&units=metric&cnt=5`)
        ]);

        return {
            current: currentRes.data,
            forecast: forecastRes.data
        };
    } catch (error) {
        throw new Error(`Failed to fetch weather data: ${error.message}`);
    }
}
