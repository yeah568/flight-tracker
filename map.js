const airportInfo = new Map();
const airportsVisited = new Set();
const paths = new Map();

const airportMarkers = new Map();
const pathPolylines = new Map();

let map;

function getAndParseData(m) {
  map = m;
  Promise.all([getAirports(), getFlights()])
    .then(([airports, flights]) => {
      buildAirportData(airports.features);
      buildFlightData(flights);

      plotAirports(airportsVisited);
      plotPaths(paths);
    })
}

function getFlights() {
  return fetch('./data/flights.json')
    .then(response => {
      if (response.status !== 200) {
        console.log('Looks like there was a problem. Status Code: ' +
          response.status);
        return;
      }
      return response.json()
    })
    .catch(err => {
      console.log('Fetch Error :-S', err);
    });
};

function getAirports() {
  return fetch('./data/airports.json')
    .then(response => {
      if (response.status !== 200) {
        console.log('Looks like there was a problem. Status Code: ' +
          response.status);
        return;
      }
      return response.json();
    })
    .catch(err => {
      console.log('Fetch Error :-S', err);
    });
};

function buildAirportData(airports) {
  airports.forEach(airport => {
    airportInfo.set(airport.properties.abbrev, airport);
  });
}

function buildFlightData(flights) {
  flights.forEach(flight => {
    const key = `${flight.departureAirport}-${flight.arrivalAirport}`;
    const reverseKey = reversePath(key);
    if (paths.has(key)) {
      paths.get(key).push(flight);
    // } else if (paths.has(reverseKey)) {
    //   paths.get(reverseKey).push(flight);
    } else {
      paths.set(key, [flight]);
    }

    airportsVisited.add(flight.departureAirport);
    airportsVisited.add(flight.arrivalAirport);
  });
}

function plotAirports(airports) {
  airports.forEach(airport => {
    const info = airportInfo.get(airport);
    const marker = new google.maps.Marker({
      map,
      position: getAirportLatLng(airport),
      title: `${info.properties.abbrev} - ${info.properties.name}`
    });
    airportMarkers.set(airport, marker);
  })
}

function plotPaths(paths) {
  const lineSymbol = {
    path: google.maps.SymbolPath.CIRCLE,
    scale: 5,
    fillColor: '#2c3e50',
  };

  paths.forEach((path, key) => {
    // key[0] is dep airport
    // key[1] is arr airport

    const [depAirport, arrAirport] = splitPath(key);
    const numFlights = path.length + (paths.has(reversePath(key)) ? paths.get(reversePath(key)).length : 0);

    const flightPath = new google.maps.Polyline({
      map,
      path: [getAirportLatLng(depAirport), getAirportLatLng(arrAirport)],
      geodesic: true,
      strokeColor: '#2c3e50',
      strokeWeight: numFlights * 2,
      icons: [{
        icon: lineSymbol,
        offset: '100%'
      }],
    });

    flightPath.addListener('click', () => {
      displayFlights(key);
    });
    pathPolylines.set(key, flightPath);
  });

  window.requestAnimationFrame(animateCircles);
}

let start = null;
const interval = 2500; //ms

function animateCircles(timestamp) {
  if (!start) {start = timestamp};

  const offset = ((timestamp - start) % interval) / interval * 100;

  pathPolylines.forEach(line => {
    line.icons[0].offset = offset + '%';
    line.notify('icons');
  });

  window.requestAnimationFrame(animateCircles);
}

// ===== Sidebar display =====

function flightTemplate(flight) {
  const t = document.querySelector('.js-flight-template');
  t.content.querySelector('.flight').textContent = `${flight.airline} ${flight.number} ${flight.departureAirport} to ${flight.arrivalAirport} ${flight.plane ? 'on a ' + flight.plane : ''}`;
  return document.importNode(t.content, true);
}

function displayFlights(path) {
  document.querySelector('.js-path-name').textContent = path;

  const flightList = document.querySelector('.js-flight-list');
  while(flightList.firstChild) flightList.removeChild(flightList.firstChild);

  const flights = [];
  if (paths.has(reversePath(path))) {flights.push(...paths.get(reversePath(path)))}
  if (paths.has(path)) {flights.push(...paths.get(path))}

  flights.forEach(flight => flightList.appendChild(flightTemplate(flight)));
}

// ===== Utils =====
function getAirportLatLng(airport) {
  const a = airportInfo.get(airport);
  return {lat: a.geometry.coordinates[1], lng: a.geometry.coordinates[0]};
}

function reversePath(path) {
  const [dep, arr] = splitPath(path);
  return `${arr}-${dep}`;
}

function splitPath(path) {
  return path.split('-');
}
