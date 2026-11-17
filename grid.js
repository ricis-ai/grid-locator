/* Grid Square Locator -- Maidenhead math, place search, result wording.
 *
 * Pure logic, no DOM here except nothing at all: the page (index.html)
 * owns the form handling and calls these functions. This file also runs
 * under Node for testing: `node test_grid.js`.
 *
 * No network calls in this file. No Google services anywhere.
 * Grids are computed on the fly; the place list never stores a grid.
 */
(function (root) {
  "use strict";

  var FIELD_LON = 20; // degrees of longitude per field
  var FIELD_LAT = 10; // degrees of latitude per field
  var SQ_LON = 2;     // degrees per square (4-character level)
  var SQ_LAT = 1;
  var SUB_LON = 2 / 24; // degrees per subsquare (6-character level)
  var SUB_LAT = 1 / 24;

  var EARTH_KM = 6371;
  var KM_PER_DEG_LAT = 111.32;

  /* US state / territory names for the Census state abbreviations. */
  var STATE_NAMES = {
    AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas",
    CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware",
    DC: "District of Columbia", FL: "Florida", GA: "Georgia",
    HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana",
    IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
    ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan",
    MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana",
    NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
    NJ: "New Jersey", NM: "New Mexico", NY: "New York",
    NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
    OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
    RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
    TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
    VA: "Virginia", WA: "Washington", WV: "West Virginia",
    WI: "Wisconsin", WY: "Wyoming",
    PR: "Puerto Rico", GU: "Guam", VI: "US Virgin Islands",
    AS: "American Samoa", MP: "Northern Mariana Islands",
    FM: "Micronesia", MH: "Marshall Islands", PW: "Palau"
  };

  /* Country names for the GeoNames country codes in the world list.
   * Generated from GeoNames countryInfo.txt by build_places.py. */
  var COUNTRY_NAMES = {"AD": "Andorra", "AE": "United Arab Emirates", "AF": "Afghanistan", "AG": "Antigua and Barbuda", "AI": "Anguilla", "AL": "Albania", "AM": "Armenia", "AO": "Angola", "AR": "Argentina", "AS": "American Samoa", "AT": "Austria", "AU": "Australia", "AW": "Aruba", "AX": "Aland Islands", "AZ": "Azerbaijan", "BA": "Bosnia and Herzegovina", "BB": "Barbados", "BD": "Bangladesh", "BE": "Belgium", "BF": "Burkina Faso", "BG": "Bulgaria", "BH": "Bahrain", "BI": "Burundi", "BJ": "Benin", "BL": "Saint Barthelemy", "BM": "Bermuda", "BN": "Brunei", "BO": "Bolivia", "BQ": "Bonaire, Saint Eustatius and Saba ", "BR": "Brazil", "BS": "Bahamas", "BT": "Bhutan", "BW": "Botswana", "BY": "Belarus", "BZ": "Belize", "CA": "Canada", "CC": "Cocos Islands", "CD": "Democratic Republic of the Congo", "CF": "Central African Republic", "CG": "Republic of the Congo", "CH": "Switzerland", "CI": "Ivory Coast", "CK": "Cook Islands", "CL": "Chile", "CM": "Cameroon", "CN": "China", "CO": "Colombia", "CR": "Costa Rica", "CU": "Cuba", "CV": "Cabo Verde", "CW": "Curacao", "CX": "Christmas Island", "CY": "Cyprus", "CZ": "Czechia", "DE": "Germany", "DJ": "Djibouti", "DK": "Denmark", "DM": "Dominica", "DO": "Dominican Republic", "DZ": "Algeria", "EC": "Ecuador", "EE": "Estonia", "EG": "Egypt", "EH": "Western Sahara", "ER": "Eritrea", "ES": "Spain", "ET": "Ethiopia", "FI": "Finland", "FJ": "Fiji", "FK": "Falkland Islands", "FM": "Micronesia", "FO": "Faroe Islands", "FR": "France", "GA": "Gabon", "GB": "United Kingdom", "GD": "Grenada", "GE": "Georgia", "GF": "French Guiana", "GG": "Guernsey", "GH": "Ghana", "GI": "Gibraltar", "GL": "Greenland", "GM": "Gambia", "GN": "Guinea", "GP": "Guadeloupe", "GQ": "Equatorial Guinea", "GR": "Greece", "GS": "South Georgia and the South Sandwich Islands", "GT": "Guatemala", "GU": "Guam", "GW": "Guinea-Bissau", "GY": "Guyana", "HK": "Hong Kong", "HN": "Honduras", "HR": "Croatia", "HT": "Haiti", "HU": "Hungary", "ID": "Indonesia", "IE": "Ireland", "IL": "Israel", "IM": "Isle of Man", "IN": "India", "IQ": "Iraq", "IR": "Iran", "IS": "Iceland", "IT": "Italy", "JE": "Jersey", "JM": "Jamaica", "JO": "Jordan", "JP": "Japan", "KE": "Kenya", "KG": "Kyrgyzstan", "KH": "Cambodia", "KI": "Kiribati", "KM": "Comoros", "KN": "Saint Kitts and Nevis", "KP": "North Korea", "KR": "South Korea", "KW": "Kuwait", "KY": "Cayman Islands", "KZ": "Kazakhstan", "LA": "Laos", "LB": "Lebanon", "LC": "Saint Lucia", "LI": "Liechtenstein", "LK": "Sri Lanka", "LR": "Liberia", "LS": "Lesotho", "LT": "Lithuania", "LU": "Luxembourg", "LV": "Latvia", "LY": "Libya", "MA": "Morocco", "MC": "Monaco", "MD": "Moldova", "ME": "Montenegro", "MF": "Saint Martin", "MG": "Madagascar", "MH": "Marshall Islands", "MK": "North Macedonia", "ML": "Mali", "MM": "Myanmar", "MN": "Mongolia", "MO": "Macao", "MP": "Northern Mariana Islands", "MQ": "Martinique", "MR": "Mauritania", "MS": "Montserrat", "MT": "Malta", "MU": "Mauritius", "MV": "Maldives", "MW": "Malawi", "MX": "Mexico", "MY": "Malaysia", "MZ": "Mozambique", "NA": "Namibia", "NC": "New Caledonia", "NE": "Niger", "NF": "Norfolk Island", "NG": "Nigeria", "NI": "Nicaragua", "NL": "The Netherlands", "NO": "Norway", "NP": "Nepal", "NR": "Nauru", "NU": "Niue", "NZ": "New Zealand", "OM": "Oman", "PA": "Panama", "PE": "Peru", "PF": "French Polynesia", "PG": "Papua New Guinea", "PH": "Philippines", "PK": "Pakistan", "PL": "Poland", "PM": "Saint Pierre and Miquelon", "PN": "Pitcairn", "PR": "Puerto Rico", "PS": "Palestinian Territory", "PT": "Portugal", "PW": "Palau", "PY": "Paraguay", "QA": "Qatar", "RE": "Reunion", "RO": "Romania", "RS": "Serbia", "RU": "Russia", "RW": "Rwanda", "SA": "Saudi Arabia", "SB": "Solomon Islands", "SC": "Seychelles", "SD": "Sudan", "SE": "Sweden", "SG": "Singapore", "SH": "Saint Helena", "SI": "Slovenia", "SJ": "Svalbard and Jan Mayen", "SK": "Slovakia", "SL": "Sierra Leone", "SM": "San Marino", "SN": "Senegal", "SO": "Somalia", "SR": "Suriname", "SS": "South Sudan", "ST": "Sao Tome and Principe", "SV": "El Salvador", "SX": "Sint Maarten", "SY": "Syria", "SZ": "Eswatini", "TC": "Turks and Caicos Islands", "TD": "Chad", "TF": "French Southern Territories", "TG": "Togo", "TH": "Thailand", "TJ": "Tajikistan", "TL": "Timor Leste", "TM": "Turkmenistan", "TN": "Tunisia", "TO": "Tonga", "TR": "Turkey", "TT": "Trinidad and Tobago", "TV": "Tuvalu", "TW": "Taiwan", "TZ": "Tanzania", "UA": "Ukraine", "UG": "Uganda", "UY": "Uruguay", "UZ": "Uzbekistan", "VA": "Vatican", "VC": "Saint Vincent and the Grenadines", "VE": "Venezuela", "VG": "British Virgin Islands", "VI": "U.S. Virgin Islands", "VN": "Vietnam", "VU": "Vanuatu", "WF": "Wallis and Futuna", "WS": "Samoa", "XK": "Kosovo", "YE": "Yemen", "YT": "Mayotte", "ZA": "South Africa", "ZM": "Zambia", "ZW": "Zimbabwe"};

  /* ---- Maidenhead grid math ------------------------------------------- */

  function cleanGrid(input) {
    return String(input || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  }

  /* Parse a 4- or 6-character grid. Returns null when it is not a valid
   * grid, with a plain-language reason in `error`. */
  function parseGrid(input) {
    var grid = cleanGrid(input);
    if (grid.length !== 4 && grid.length !== 6) {
      return { grid: grid, ok: false,
        error: "A grid square has 4 or 6 characters, like FN21 or EN61CN." };
    }
    var field = grid.slice(0, 2), square = grid.slice(2, 4);
    if (!/^[A-R]{2}$/.test(field)) {
      return { grid: grid, ok: false,
        error: "The first two letters of a grid square run from A to R." };
    }
    if (!/^[0-9]{2}$/.test(square)) {
      return { grid: grid, ok: false,
        error: "The next two characters of a grid square are numbers." };
    }
    if (grid.length === 6 && !/^[A-X]{2}$/.test(grid.slice(4, 6))) {
      return { grid: grid, ok: false,
        error: "The last two letters of a 6-character grid square run from A to X." };
    }
    return { grid: grid, ok: true, error: "" };
  }

  /* Bounds and centre of a grid square. Input must already be validated
   * (see parseGrid). Returns south-west and north-east corners, centre,
   * and the span in degrees. */
  function gridToBounds(grid) {
    var lon = (grid.charCodeAt(0) - 65) * FIELD_LON - 180
      + (grid.charCodeAt(2) - 48) * SQ_LON;
    var lat = (grid.charCodeAt(1) - 65) * FIELD_LAT - 90
      + (grid.charCodeAt(3) - 48) * SQ_LAT;
    var lonSpan = SQ_LON, latSpan = SQ_LAT;
    if (grid.length === 6) {
      lon += (grid.charCodeAt(4) - 65) * SUB_LON;
      lat += (grid.charCodeAt(5) - 65) * SUB_LAT;
      lonSpan = SUB_LON; latSpan = SUB_LAT;
    }
    return {
      grid: grid,
      swLon: lon, swLat: lat,
      neLon: lon + lonSpan, neLat: lat + latSpan,
      centreLon: lon + lonSpan / 2, centreLat: lat + latSpan / 2,
      lonSpan: lonSpan, latSpan: latSpan
    };
  }

  /* Grid square for a latitude/longitude. precision is 4 or 6 (default 6).
   * Output is uppercase, e.g. "EN61CN". */
  function latLonToGrid(lat, lon, precision) {
    precision = precision === 4 ? 4 : 6;
    var adjLon = Math.min(179.999999, Math.max(-180, lon)) + 180;
    var adjLat = Math.min(89.999999, Math.max(-90, lat)) + 90;
    var fieldLon = Math.floor(adjLon / FIELD_LON);
    var fieldLat = Math.floor(adjLat / FIELD_LAT);
    var remLon = adjLon - fieldLon * FIELD_LON;
    var remLat = adjLat - fieldLat * FIELD_LAT;
    var sqLon = Math.floor(remLon / SQ_LON);
    var sqLat = Math.floor(remLat / SQ_LAT);
    var grid = String.fromCharCode(65 + fieldLon)
      + String.fromCharCode(65 + fieldLat)
      + String(sqLon) + String(sqLat);
    if (precision === 6) {
      var subLon = Math.floor((remLon - sqLon * SQ_LON) / SUB_LON);
      var subLat = Math.floor((remLat - sqLat * SQ_LAT) / SUB_LAT);
      grid += String.fromCharCode(65 + Math.min(23, subLon))
        + String.fromCharCode(65 + Math.min(23, subLat));
    }
    return grid;
  }

  /* ---- Distance and direction ----------------------------------------- */

  function toRad(deg) { return deg * Math.PI / 180; }

  function haversineKm(lat1, lon1, lat2, lon2) {
    var dLat = toRad(lat2 - lat1);
    var dLon = toRad(lon2 - lon1);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
      + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2))
      * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * EARTH_KM * Math.asin(Math.sqrt(a));
  }

  /* Compass direction from point 1 to point 2, as a plain word:
   * north, north-east, east, south-east, south, south-west, west,
   * north-west. Returns "" when the two points are effectively the same. */
  function bearingWord(lat1, lon1, lat2, lon2) {
    var dLon = toRad(lon2 - lon1);
    var y = Math.sin(dLon) * Math.cos(toRad(lat2));
    var x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2))
      - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
    var bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    var points = ["north", "north-east", "east", "south-east",
                  "south", "south-west", "west", "north-west"];
    return points[Math.round(bearing / 45) % 8];
  }

  function formatKm(km) {
    if (km < 10) return (Math.round(km * 10) / 10).toFixed(1);
    return String(Math.round(km));
  }

  function formatMiles(km) {
    var miles = km * 0.621371;
    if (miles < 10) return (Math.round(miles * 10) / 10).toFixed(1);
    return String(Math.round(miles));
  }

  /* "1.2 kilometers (0.8 miles)" -- words, not abbreviations, so screen
   * readers say them the same way on every device. */
  function formatDistance(km) {
    return formatKm(km) + " kilometers (" + formatMiles(km) + " miles)";
  }

  /* "41.5625 degrees north, 87.7917 degrees west" -- words, not symbols. */
  function formatCoords(lat, lon) {
    var latPart = Math.abs(Math.round(lat * 10000) / 10000).toFixed(4)
      + " degrees " + (lat < 0 ? "south" : "north");
    var lonPart = Math.abs(Math.round(lon * 10000) / 10000).toFixed(4)
      + " degrees " + (lon < 0 ? "west" : "east");
    return latPart + ", " + lonPart;
  }

  /* "E N 6 1 C N" -- spaced so a screen reader says each character. */
  function spellGrid(grid) {
    return grid.split("").join(" ");
  }

  /* ---- Places ---------------------------------------------------------- */
  /* US entry:   [name, stateAbbr, lat, lon]
   * World entry: [name, countryCode, lat, lon, population] */

  function placeLabel(place, dataset) {
    if (dataset === "us") {
      var state = STATE_NAMES[place[1]] || place[1];
      return place[0] + ", " + state;
    }
    var country = COUNTRY_NAMES[place[1]] || place[1];
    return place[0] + ", " + country;
  }

  /* The n nearest named places to a point, nearest first. Each result is
   * {label, lat, lon, km, direction, dataset}. A plain linear scan over
   * about 40,000 places takes a few milliseconds. */
  function nearestPlaces(data, lat, lon, n) {
    var best = [];
    function consider(place, dataset) {
      var km = haversineKm(lat, lon, place[2], place[3]);
      var entry = {
        label: placeLabel(place, dataset),
        lat: place[2], lon: place[3], km: km,
        direction: km < 0.05 ? "" : bearingWord(lat, lon, place[2], place[3]),
        dataset: dataset
      };
      var i = best.length;
      while (i > 0 && best[i - 1].km > km) i--;
      if (i < n) {
        best.splice(i, 0, entry);
        if (best.length > n) best.length = n;
      }
    }
    var i;
    for (i = 0; i < data.us.length; i++) consider(data.us[i], "us");
    for (i = 0; i < data.world.length; i++) consider(data.world[i], "world");
    return best;
  }

  /* Fold accents and case so "malmo" finds "Malmö" and "quebec" finds
   * "Québec". */
  function fold(text) {
    return String(text).toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  /* Search places by name. A comma splits a region filter: "Springfield,
   * Illinois" or "London, Canada". Returns at most `limit` matches,
   * ordered exact match, then starts-with, then contains; inside a tier,
   * larger world cities first, then alphabetical. */
  function searchPlaces(data, query, limit) {
    limit = limit || 10;
    var parts = String(query || "").split(",");
    var nameQ = fold(parts[0]).trim();
    var regionQ = parts.length > 1 ? fold(parts.slice(1).join(",")).trim() : "";
    if (!nameQ) return [];
    var results = [];
    function regionMatches(place, dataset) {
      if (!regionQ) return true;
      if (dataset === "us") {
        return fold(place[1]).indexOf(regionQ) !== -1
          || fold(STATE_NAMES[place[1]] || "").indexOf(regionQ) !== -1;
      }
      return fold(place[1]).indexOf(regionQ) !== -1
        || fold(COUNTRY_NAMES[place[1]] || "").indexOf(regionQ) !== -1;
    }
    function consider(place, dataset) {
      var name = fold(place[0]);
      var tier = -1;
      if (name === nameQ) tier = 0;
      else if (name.indexOf(nameQ) === 0) tier = 1;
      else if (name.indexOf(nameQ) !== -1) tier = 2;
      if (tier < 0 || !regionMatches(place, dataset)) return;
      results.push({
        label: placeLabel(place, dataset),
        name: place[0],
        lat: place[2], lon: place[3],
        pop: dataset === "world" ? place[4] : 0,
        tier: tier
      });
    }
    var i;
    for (i = 0; i < data.us.length; i++) consider(data.us[i], "us");
    for (i = 0; i < data.world.length; i++) consider(data.world[i], "world");
    results.sort(function (a, b) {
      if (a.tier !== b.tier) return a.tier - b.tier;
      if (b.pop !== a.pop) return b.pop - a.pop;
      if (a.label < b.label) return -1;
      if (a.label > b.label) return 1;
      return 0;
    });
    return results.slice(0, limit);
  }

  /* Width and height of a square in kilometres, measured between its
   * corners so the narrowing toward the poles is real, not estimated. */
  function squareSizeKm(bounds) {
    var height = haversineKm(bounds.swLat, bounds.swLon,
                             bounds.neLat, bounds.swLon);
    var width = haversineKm(bounds.swLat, bounds.swLon,
                            bounds.swLat, bounds.neLon);
    return { widthKm: width, heightKm: height };
  }

  var api = {
    parseGrid: parseGrid,
    cleanGrid: cleanGrid,
    gridToBounds: gridToBounds,
    latLonToGrid: latLonToGrid,
    haversineKm: haversineKm,
    bearingWord: bearingWord,
    formatDistance: formatDistance,
    formatCoords: formatCoords,
    spellGrid: spellGrid,
    placeLabel: placeLabel,
    nearestPlaces: nearestPlaces,
    searchPlaces: searchPlaces,
    squareSizeKm: squareSizeKm,
    fold: fold,
    STATE_NAMES: STATE_NAMES,
    COUNTRY_NAMES: COUNTRY_NAMES
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.GridLocator = api;
  }
})(typeof self !== "undefined" ? self : this);
