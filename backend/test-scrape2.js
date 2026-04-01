const fs = require('fs');
const fetchFromUrl = async () => {
  try {
    const res = await fetch('https://remax.bo/propiedad/venta-hoteledificio-de-apartamentos-santa-cruz-de-la-sierra-equipetrolnoroeste-1200346203-1', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });
    const html = await res.text();
    fs.writeFileSync('remax_test.html', html);
    console.log("Saved HTML of length", html.length);
  } catch (err) {
    console.error(err);
  }
};
fetchFromUrl();
