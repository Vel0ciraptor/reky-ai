async function testGeocode(address: string) {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address + ', Santa Cruz, Bolivia')}&format=json&limit=1`,
      { headers: { 'User-Agent': 'RekyAI/1.0' } }
    );
    const data = await r.json();
    return data[0];
  } catch (e) {
    return null;
  }
}

async function run() {
  const addresses = [
    "Equipetrol/NorOeste, Santa Cruz de la Sierra",
    "Banzer km9 y km10, Santa Cruz de la Sierra",
    "Urbarí, Santa Cruz de la Sierra"
  ];
  
  for (const addr of addresses) {
    const result = await testGeocode(addr);
    console.log(`Address: ${addr}`);
    console.log(`Geocoded Result: ${result ? result.lat + ', ' + result.lon : 'NOT FOUND'}`);
  }
}

run();
