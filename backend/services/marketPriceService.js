import axios from "axios";

export const getMandiPrices = async () => {

  try {

    const response = await axios.get(
      "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070",
      {
        params: {
          "api-key": process.env.DATA_GOV_API_KEY,
          format: "json",
          limit: 1000
        }
      }
    );

    const selectedCrops = [
      "tomato",
      "onion",
      "potato",
      "rice",
      "carrot"
    ];

    const formattedData = response.data.records

      .filter(item =>
        item.state?.toLowerCase().includes("tamil")
      )

      .filter(item =>
        selectedCrops.some(crop =>
          item.commodity?.toLowerCase().includes(crop)
        )
      )

      .map(item => ({

        commodity: item.commodity,

        market: item.market,

        price_per_kg:
          (Number(item.modal_price) / 100).toFixed(2),

        date: item.arrival_date

      }));


    console.log(formattedData);
    return formattedData;

  } catch (err) {

    console.log(err.message);

    return [];

  }

};

export const getCropPriceHistory = async (cropName) => {
  try {
    const response = await axios.get(
      "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070",
      {
        params: {
          "api-key": process.env.DATA_GOV_API_KEY,
          format: "json",
          limit: 1000
        }
      }
    );

    const filteredData = response.data.records.filter(item =>
      item.commodity?.toLowerCase().includes(cropName.toLowerCase())
    );

    const mapByDate = new Map();
    filteredData.forEach(item => {
      if (!mapByDate.has(item.arrival_date)) {
        mapByDate.set(item.arrival_date, parseFloat(item.modal_price) / 100);
      }
    });

    let sequence = Array.from(mapByDate.keys()).sort((a, b) => {
      const parseDate = dstr => {
        if (dstr.includes('/')) {
          const [d, m, y] = dstr.split('/');
          return new Date(`${y}-${m}-${d}`).getTime();
        }
        return new Date(dstr).getTime();
      };
      return parseDate(b) - parseDate(a);
    }).map(date => mapByDate.get(date));

    let latest10 = sequence.slice(0, 10);

    if (latest10.length === 0) {
      return [40, 42, 41, 44, 45, 43, 46, 48, 50, 49];
    }

    while (latest10.length < 10) {
      latest10.push(latest10[latest10.length - 1]);
    }

    latest10.reverse();
    return latest10;

  } catch (err) {
    console.log(err.message);
    return [40, 42, 41, 44, 45, 43, 46, 48, 50, 49];
  }
};