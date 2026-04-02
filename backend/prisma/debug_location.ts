async function fetchDebug(url: string) {
  try {
     const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
      },
    });
    const html = await res.text();
    const dataPageMatch = html.match(/data-page="([^"]+)"/);
    if (!dataPageMatch) return null;
    const decodedHtml = dataPageMatch[1].replace(/&quot;/g, '"');
    const data = JSON.parse(decodedHtml);
    const listing = data.props.listing;
    
    console.log('Listing Keys:', Object.keys(listing));
    console.log('Title:', listing.title);
    console.log('Address Website:', listing.address_website);
    console.log('Address:', listing.address);
    console.log('Display Address:', listing.display_address);
  } catch (e) {
    console.error(e);
  }
}

const url = 'https://remax.bo/propiedad/venta-hoteledificio-de-apartamentos-santa-cruz-de-la-sierra-equipetrolnoroeste-1200346203-1';
fetchDebug(url);
