[out:json][timeout:180];
area["ISO3166-1"="BR"][admin_level=2]->.br;
(
  nwr["amenity"="recycling"]["recycling:electrical_items"="yes"](area.br);
  nwr["amenity"="recycling"]["recycling:small_appliances"="yes"](area.br);
  nwr["amenity"="recycling"]["recycling:computers"="yes"](area.br);
  nwr["amenity"="recycling"]["recycling:mobile_phones"="yes"](area.br);
  nwr["amenity"="recycling"]["recycling:batteries"="yes"](area.br);
);
out center tags;
