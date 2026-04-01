const fetchFromUrl = async () => {
  try {
    const res = await fetch('https://remax.bo/propiedad/venta-hoteledificio-de-apartamentos-santa-cruz-de-la-sierra-equipetrolnoroeste-1200346203-1');
    const html = await res.text();
    const matches = html.match(/<img[^>]+src=["']([^"']+)["']/g);
    console.log("Images found:", matches ? matches.slice(0, 15) : "None");
    
    const ogMatches = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/);
    console.log("OG Image:", ogMatches ? ogMatches[1] : "None");
  } catch (err) {
    console.error(err);
  }
};
fetchFromUrl();
