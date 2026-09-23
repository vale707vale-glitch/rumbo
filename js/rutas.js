const map = L.map('map').setView([-34.6037, -58.3816], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors', crossOrigin: true }).addTo(map);

    let userPolyline = null, optimalPolyline = null, routePolyline = null, altPolyline = null;
    let fuelLayer = L.layerGroup().addTo(map);
    let tollLayer = L.layerGroup().addTo(map);
    let restLayer = L.layerGroup().addTo(map);
    let extraMarkers = [];
    let markers = {}; 
    let pinMode = null; 
    let currentMode = 'ciudad';
    let currentCiudadTab = 'pasos';
    
    let currentMainSteps = [];
    let currentAltSteps = [];

    function togglePanel() {
        const panel = document.getElementById('panel');
        const btnShow = document.querySelector('.btn-show-menu');
        if (panel.style.display === 'none') {
            panel.style.display = 'block';
            btnShow.style.display = 'none';
        } else {
            panel.style.display = 'none';
            btnShow.style.display = 'block';
            setTimeout(() => map.invalidateSize(), 100); 
        }
    }

    function decodePolyline6(str) {
        let index = 0, lat = 0, lng = 0, coordinates = [];
        let shift = 0, result = 0;
        let byte = null, latitude_change, longitude_change;
        while (index < str.length) {
            byte = null; shift = 0; result = 0;
            do {
                byte = str.charCodeAt(index++) - 63;
                result |= (byte & 0x1f) << shift;
                shift += 5;
            } while (byte >= 0x20);
            latitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lat += latitude_change;
            shift = 0; result = 0;
            do {
                byte = str.charCodeAt(index++) - 63;
                result |= (byte & 0x1f) << shift;
                shift += 5;
            } while (byte >= 0x20);
            longitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lng += longitude_change;
            coordinates.push([lat / 1e6, lng / 1e6]);
        }
        return coordinates;
    }

    function switchMode(mode, event) {
        currentMode = mode;
        document.querySelectorAll('.mode-btn').forEach(t => t.classList.remove('active'));
        if(event) event.target.classList.add('active');
        document.getElementById('view-ciudad').style.display = mode === 'ciudad' ? 'block' : 'none';
        document.getElementById('view-nacional').style.display = mode === 'nacional' ? 'block' : 'none';
        clearAll();
    }

    function switchCiudadTab(tab, event) {
        currentCiudadTab = tab;
        document.querySelectorAll('#view-ciudad .sub-btn').forEach(t => t.classList.remove('active'));
        if(event) event.target.classList.add('active');
        document.getElementById('ciudad-pasos').style.display = tab === 'pasos' ? 'block' : 'none';
        document.getElementById('ciudad-itinerario').style.display = tab === 'itinerario' ? 'block' : 'none';
    }

    function activatePinMode(type) {
        pinMode = type;
        map.getContainer().style.cursor = 'crosshair';
        alert("Hacé clic en el mapa donde querés fijar este punto.");
        if (window.innerWidth < 768) {
            togglePanel(); 
        }
    }

    map.on('click', async (e) => {
        if (!pinMode) return;
        const lat = e.latlng.lat; const lon = e.latlng.lng;
        map.getContainer().style.cursor = '';
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
        const response = await fetch(url); const data = await response.json();
        const address = data.display_name ? data.display_name.split(',').slice(0, 3).join(',') : `${lat.toFixed(4)}, ${lon.toFixed(4)}`;

        if (pinMode === 'partida') {
            document.getElementById('partida').value = address;
            if (markers.partida) map.removeLayer(markers.partida);
            markers.partida = L.marker([lat, lon]).addTo(map).bindPopup('Inicio').openPopup();
        } else if (pinMode === 'destino') {
            document.getElementById('destino').value = address;
            if (markers.destino) map.removeLayer(markers.destino);
            markers.destino = L.marker([lat, lon]).addTo(map).bindPopup('Destino').openPopup();
        }
        pinMode = null;
        if (window.innerWidth < 768 && document.getElementById('panel').style.display === 'none') {
            togglePanel();
        }
    });

    async function geocode(address) {
        try {
            let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
            let response = await fetch(url); let data = await response.json();
            if (data && data.length > 0) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
            let addressNoNum = address.replace(/ \d+/g, ''); 
            if (addressNoNum !== address) {
                url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressNoNum)}`;
                response = await fetch(url); data = await response.json();
                if (data && data.length > 0) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
            }
        } catch (e) { console.error(e); }
        return null;
    }

    async function searchMap() {
        const query = document.getElementById('mapSearch').value; if (!query) return;
        const coords = await geocode(query);
        if (coords) map.flyTo(coords, 14); else alert("Lugar no encontrado.");
    }

    function clearAll() {
        if (userPolyline) { map.removeLayer(userPolyline); userPolyline = null; }
        if (optimalPolyline) { map.removeLayer(optimalPolyline); optimalPolyline = null; }
        if (routePolyline) { map.removeLayer(routePolyline); routePolyline = null; }
        if (altPolyline) { map.removeLayer(altPolyline); altPolyline = null; }
        fuelLayer.clearLayers(); tollLayer.clearLayers(); restLayer.clearLayers();
        for (let key in markers) { if (markers[key]) map.removeLayer(markers[key]); }
        markers = {};
        for (let mk of extraMarkers) { if (mk) map.removeLayer(mk); }
        extraMarkers = [];
        document.getElementById('resultados').style.display = 'none';
        document.getElementById('infoRuta').style.display = 'none';
        document.getElementById('itinerarioRuta').style.display = 'none';
        document.getElementById('routeToggle').style.display = 'none';
        document.getElementById('btnMainRoute').innerText = "Ruta Principal";
        document.getElementById('btnAltRoute').innerText = "Alternativa";
    }

    function formatDistance(meters) {
        if (meters < 1000) return `${Math.round(meters)} m`;
        return `${(meters / 1000).toFixed(1)} km`;
    }
    function formatDuration(seconds) {
        if (seconds < 60) return "< 1 min";
        const mins = Math.round(seconds / 60);
        if (mins < 60) return `${mins} min`;
        const hrs = Math.floor(mins / 60);
        const remMins = mins % 60;
        return `${hrs} h ${remMins} min`;
    }

    function translateModifier(mod) {
        const map = { 'uturn': 'en U', 'sharp right': 'totalmente a la derecha', 'right': 'a la derecha', 'slight right': 'levemente a la derecha', 'straight': 'recto', 'slight left': 'levemente a la izquierda', 'left': 'a la izquierda', 'sharp left': 'totalmente a la izquierda' };
        return map[mod] || '';
    }

    function parseOSRMSteps(routeData) {
        const pasos = [];
        if (routeData && routeData.legs) {
            routeData.legs.forEach(leg => {
                leg.steps.forEach(step => {
                    let type = step.maneuver.type;
                    let mod = step.maneuver.modifier ? translateModifier(step.maneuver.modifier) : '';
                    let nombre = step.name ? step.name : 'la ruta';
                    let inst = '';
                    switch(type) {
                        case 'depart': inst = `Iniciar viaje en ${nombre}`; break;
                        case 'arrive': inst = `Llegar a destino (${nombre})`; break;
                        case 'turn': inst = (mod === 'recto' || !mod) ? `Seguir recto hacia ${nombre}` : `Girar ${mod} hacia ${nombre}`; break;
                        case 'new name': case 'continue': inst = `Continuar ${mod} por ${nombre}`; break;
                        case 'merge': inst = `Incorporarse ${mod} hacia ${nombre}`; break;
                        case 'on ramp': inst = `Tomar rampa de acceso hacia ${nombre}`; break;
                        case 'off ramp': inst = `Tomar salida hacia ${nombre}`; break;
                        case 'fork': inst = `Bifurcarse ${mod} hacia ${nombre}`; break;
                        case 'end of road': inst = (mod === 'recto' || !mod) ? `Al final de la calle, seguir recto hacia ${nombre}` : `Al final de la calle, girar ${mod} hacia ${nombre}`; break;
                        case 'roundabout': case 'rotary': inst = `En la rotonda, tomar salida hacia ${nombre}`; break;
                        case 'roundabout turn': inst = `En la rotonda, girar ${mod} hacia ${nombre}`; break;
                        default: inst = `Continuar hacia ${nombre}`;
                    }
                    pasos.push(inst);
                });
            });
        }
        return pasos;
    }

    function parseValhallaSteps(data) {
        const pasos = [];
        if (data && data.trip && data.trip.legs) {
            data.trip.legs.forEach(leg => {
                leg.maneuvers.forEach(man => {
                    let type = man.type;
                    let nombre = (man.street_names && man.street_names.length > 0) ? man.street_names[0] : 'la ruta';
                    let inst = '';
                    switch(type) {
                        case 1: inst = `Iniciar viaje en ${nombre}`; break; 
                        case 4: case 5: case 6: inst = `Llegar a destino (${nombre})`; break; 
                        case 8: inst = `Continuar por ${nombre}`; break; 
                        case 9: inst = `Girar levemente a la derecha hacia ${nombre}`; break; 
                        case 10: inst = `Girar a la derecha hacia ${nombre}`; break; 
                        case 11: inst = `Girar totalmente a la derecha hacia ${nombre}`; break; 
                        case 13: inst = `Girar totalmente a la izquierda hacia ${nombre}`; break; 
                        case 14: inst = `Girar a la izquierda hacia ${nombre}`; break; 
                        case 15: inst = `Girar levemente a la izquierda hacia ${nombre}`; break; 
                        case 23: inst = `Incorporarse hacia ${nombre}`; break; 
                        case 24: case 25: inst = `En la rotonda, tomar salida hacia ${nombre}`; break; 
                        default: inst = `Continuar hacia ${nombre}`;
                    }
                    pasos.push(inst);
                });
            });
        }
        return pasos;
    }

    function showItinerario(type) {
        const list = document.getElementById('itinerarioLista');
        if (type === 'main') {
            list.innerHTML = currentMainSteps.map(p => `<li>${p}</li>`).join('');
            document.getElementById('btnMainRoute').classList.add('active-main');
            document.getElementById('btnAltRoute').classList.remove('active-alt');
        } else {
            list.innerHTML = currentAltSteps.map(p => `<li>${p}</li>`).join('');
            document.getElementById('btnMainRoute').classList.remove('active-main');
            document.getElementById('btnAltRoute').classList.add('active-alt');
        }
    }

    function addStepCiudad() {
        const container = document.getElementById('steps-container-ciudad');
        const stepDiv = document.createElement('div');
        stepDiv.className = 'step-container';
        stepDiv.innerHTML = `
            <select class="accion"><option value="recto">Ir por</option><option value="derecha">Girar Der.</option><option value="izquierda">Girar Izq.</option></select>
            <input type="text" class="calle" placeholder="Calle" style="margin-left: 5%;">
            <input type="number" class="cantidad" placeholder="Cant." min="1" value="1">
            <select class="unidad" style="margin-left: 5%;"><option value="cuadras">Cuadras</option><option value="metros">Metros</option></select>
            <select class="rumbo" style="margin-left: 5%;"><option value="0">Norte</option><option value="90">Este</option><option value="180">Sur</option><option value="270">Oeste</option></select>
            <button onclick="this.parentElement.remove()" class="btn-red btn-small" style="width: 100%; margin-top: 5px;">Eliminar</button>
        `;
        container.appendChild(stepDiv);
    }

    let stopCounterCiudad = 0;
    function addStopCiudadIti() {
        stopCounterCiudad++;
        const container = document.getElementById('stops-container-ciudad');
        const div = document.createElement('div');
        div.className = 'stop-container';
        div.innerHTML = `
            <label>Parada ${stopCounterCiudad}:</label>
            <input type="text" id="stop_ciudad_${stopCounterCiudad}" placeholder="Ej: Av. Cabildo y Av. Santa Fe">
            <button onclick="this.previousElementSibling.remove(); this.remove();" class="btn-red btn-small" style="width:100%; margin-top:5px;">Eliminar</button>
        `;
        container.appendChild(div);
    }

    function getDestinationPoint(lat, lon, bearing, distance) {
        const R = 6371e3; const δ = Number(distance) / R; const θ = Number(bearing) * Math.PI / 180;
        const φ1 = Number(lat) * Math.PI / 180; const λ1 = Number(lon) * Math.PI / 180;
        const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ));
        const λ2 = λ1 + Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ1), Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2));
        return [φ2 * 180 / Math.PI, (λ2 * 180 / Math.PI + 540) % 360 - 180];
    }

    async function drawCiudadRoute() {
        clearAll();
        let pointsForOSRM = []; let totalDistance = 0; let hasManualSteps = false;
        if (currentCiudadTab === 'pasos') {
            let startCoords = markers.partida ? [markers.partida.getLatLng().lat, markers.partida.getLatLng().lng] : await geocode(document.getElementById('partida').value);
            if (!startCoords) { alert("Punto de partida no encontrado."); return; }
            if (!markers.partida) markers.partida = L.marker(startCoords).addTo(map).bindPopup('Inicio').openPopup();
            pointsForOSRM.push(startCoords); let currentCoords = startCoords;
            const stepElements = document.querySelectorAll('#steps-container-ciudad .step-container');
            for (let step of stepElements) {
                let cantidad = parseInt(step.querySelector('.cantidad').value);
                if (!isNaN(cantidad) && cantidad > 0) {
                    hasManualSteps = true;
                    let unidad = step.querySelector('.unidad').value; let rumbo = step.querySelector('.rumbo').value;
                    let distance = unidad === 'cuadras' ? cantidad * 100 : cantidad;
                    totalDistance += distance;
                    currentCoords = getDestinationPoint(currentCoords[0], currentCoords[1], rumbo, distance);
                    pointsForOSRM.push(currentCoords);
                }
            }
            let endCoords = markers.destino ? [markers.destino.getLatLng().lat, markers.destino.getLatLng().lng] : (document.getElementById('destino').value ? await geocode(document.getElementById('destino').value) : null);
            if (endCoords) { pointsForOSRM.push(endCoords); if (!markers.destino) markers.destino = L.marker(endCoords).addTo(map).bindPopup('Destino'); }
        } else {
            for (let i = 1; i <= stopCounterCiudad; i++) {
                const stopInput = document.getElementById(`stop_ciudad_${i}`);
                if (stopInput && stopInput.value) {
                    const stopCoords = await geocode(stopInput.value);
                    if (stopCoords) {
                        pointsForOSRM.push(stopCoords);
                        extraMarkers.push(L.marker(stopCoords).addTo(map).bindPopup(`Parada ${i}`).openPopup());
                    }
                }
            }
        }
        if (pointsForOSRM.length < 2) { alert("Faltan puntos o paradas para dibujar."); return; }
        const resDiv = document.getElementById('resultados');
        resDiv.style.display = 'block';
        resDiv.innerHTML = '<span class="loader"></span> Calculando rutas y tiempos...';
        const routingEngine = document.getElementById('routing-engine').value;
        const profile = document.getElementById('transporte-ciudad').value;
        try {
            let msg = `<h3>Resumen del Recorrido</h3>`;
            currentMainSteps = []; currentAltSteps = [];
            let speedKmh = parseFloat(document.getElementById('speed-driving').value);
            if (isNaN(speedKmh) || speedKmh <= 0) speedKmh = 30;
            const speedMps = speedKmh / 3.6;
            if (hasManualSteps) {
                userPolyline = L.polyline(pointsForOSRM, {color: 'blue', weight: 4}).addTo(map);
                window.userDistance = totalDistance;
                msg += `<p>Tu ruta manual: <b>${formatDistance(totalDistance)}</b> (en línea recta)</p>`;
                const url = `https://router.project-osrm.org/route/v1/${profile}/${pointsForOSRM.map(c => `${c[1]},${c[0]}`).join(';')}?overview=full&geometries=geojson&steps=true`;
                const response = await fetch(url); const data = await response.json();
                if (data.code === 'Ok') currentMainSteps = parseOSRMSteps(data.routes[0]);
            } else {
                if (routingEngine === 'osrm') {
                    const url = `https://router.project-osrm.org/route/v1/${profile}/${pointsForOSRM.map(c => `${c[1]},${c[0]}`).join(';')}?overview=full&geometries=geojson&steps=true&alternatives=true`;
                    const response = await fetch(url);
                    const data = await response.json();
                    if (data.code === 'Ok') {
                        const mainRoute = data.routes[0];
                        userPolyline = L.polyline(mainRoute.geometry.coordinates.map(c => [c[1], c[0]]), {color: 'blue', weight: 4}).addTo(map);
                        window.userDistance = mainRoute.distance;
                        currentMainSteps = parseOSRMSteps(mainRoute);
                        const walkTimeMain = formatDuration(mainRoute.distance / 1.39);
                        const driveTimeMain = formatDuration(mainRoute.distance / speedMps);
                        msg += `<p>🔵 <b>Ruta Principal (Azul):</b> ${formatDistance(mainRoute.distance)}<br>🚶 A pie: ${walkTimeMain} | 🚗 Auto (a ${speedKmh} km/h): ${driveTimeMain}</p>`;
                        if (data.routes.length > 1) {
                            const altRoute = data.routes[1];
                            altPolyline = L.polyline(altRoute.geometry.coordinates.map(c => [c[1], c[0]]), {color: 'orange', weight: 4, dashArray: '5, 5'}).addTo(map);
                            currentAltSteps = parseOSRMSteps(altRoute);
                            const walkTimeAlt = formatDuration(altRoute.distance / 1.39);
                            const driveTimeAlt = formatDuration(altRoute.distance / speedMps);
                            msg += `<p>🟠 <b>Alternativa (Naranja):</b> ${formatDistance(altRoute.distance)}<br>🚶 A pie: ${walkTimeAlt} | 🚗 Auto (a ${speedKmh} km/h): ${driveTimeAlt}</p>`;
                        }
                    } else {
                        userPolyline = L.polyline(pointsForOSRM, {color: 'blue', weight: 4}).addTo(map);
                        msg += "No se encontró una ruta precisa por asfalto. Mostrando línea recta.";
                    }
                } else { 
                    const valhallaProfile = profile === 'foot' ? 'pedestrian' : 'auto';
                    let valhallaCostingOptions = {};
                    if (valhallaProfile === 'auto') {
                        valhallaCostingOptions = { "auto": { "use_highways": 0, "use_tolls": 0 } };
                    } else {
                        valhallaCostingOptions = { "pedestrian": { "use_tracks": 1 } };
                    }
                    const payload = {
                        costing: valhallaProfile,
                        costing_options: valhallaCostingOptions,
                        locations: pointsForOSRM.map(c => ({lat: c[0], lon: c[1]})),
                        directions: { language: "es-ES", units: "kilometers" }
                    };
                    const response = await fetch('https://valhalla1.openstreetmap.de/route', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    const data = await response.json();
                    if (data.trip && data.trip.legs && data.trip.legs.length > 0) {
                        const encodedShape = data.trip.legs[0].shape;
                        const routeCoords = decodePolyline6(encodedShape); 
                        if (routeCoords.length > 0) {
                            userPolyline = L.polyline(routeCoords, {color: 'blue', weight: 4}).addTo(map);
                            const distMeters = data.trip.summary.length * 1000; 
                            window.userDistance = distMeters;
                            currentMainSteps = parseValhallaSteps(data);
                            const walkTime = formatDuration(distMeters / 1.39);
                            const driveTime = formatDuration(distMeters / speedMps);
                            msg += `<p>🔵 <b>Ruta Más Corta (Azul):</b> ${formatDistance(distMeters)}<br>🚶 A pie: ${walkTime} | 🚗 Auto (a ${speedKmh} km/h): ${driveTime}</p>`;
                        } else {
                            throw new Error("La ruta de Valhalla no tiene coordenadas.");
                        }
                    } else {
                        throw new Error(data.error || "Valhalla no pudo calcular la ruta");
                    }
                }
            }
            resDiv.innerHTML = msg;
            if (currentMainSteps.length > 0) {
                document.getElementById('itinerarioLista').innerHTML = currentMainSteps.map(p => `<li>${p}</li>`).join('');
                document.getElementById('itinerarioRuta').style.display = 'block';
                if (currentAltSteps.length > 0 && routingEngine === 'osrm') {
                    document.getElementById('routeToggle').style.display = 'flex';
                    showItinerario('main');
                } else {
                    document.getElementById('routeToggle').style.display = 'none';
                }
            }
            if (altPolyline) {
                map.fitBounds(L.featureGroup([userPolyline, altPolyline]).getBounds());
            } else if (userPolyline) {
                map.fitBounds(userPolyline.getBounds());
            }
        } catch (error) {
            console.error("Error en drawCiudadRoute:", error);
            resDiv.innerHTML = "Hubo un error al calcular la ruta. Intentalo de nuevo.";
        }
    }

    async function compararRutasCiudad() {
        clearAll();
        const resDiv = document.getElementById('resultados');
        resDiv.style.display = 'block';
        resDiv.innerHTML = '<span class="loader"></span> Comparando rutas...';
        let points = [];
        if (currentCiudadTab === 'pasos') {
            let startCoords = markers.partida ? [markers.partida.getLatLng().lat, markers.partida.getLatLng().lng] : await geocode(document.getElementById('partida').value);
            if (!startCoords) { alert("Punto de partida no encontrado."); return; }
            if (!markers.partida) markers.partida = L.marker(startCoords).addTo(map).bindPopup('Inicio').openPopup();
            points.push(startCoords);
            let endCoords = markers.destino ? [markers.destino.getLatLng().lat, markers.destino.getLatLng().lng] : (document.getElementById('destino').value ? await geocode(document.getElementById('destino').value) : null);
            if (endCoords) { points.push(endCoords); if (!markers.destino) markers.destino = L.marker(endCoords).addTo(map).bindPopup('Destino'); }
        } else {
            for (let i = 1; i <= stopCounterCiudad; i++) {
                const stopInput = document.getElementById(`stop_ciudad_${i}`);
                if (stopInput && stopInput.value) {
                    const stopCoords = await geocode(stopInput.value);
                    if (stopCoords) {
                        points.push(stopCoords);
                        extraMarkers.push(L.marker(stopCoords).addTo(map).bindPopup(`Parada ${i}`).openPopup());
                    }
                }
            }
        }
        if (points.length < 2) { alert("Faltan puntos para comparar."); return; }
        const profile = document.getElementById('transporte-ciudad').value;
        let speedKmh = parseFloat(document.getElementById('speed-driving').value);
        if (isNaN(speedKmh) || speedKmh <= 0) speedKmh = 30;
        const speedMps = speedKmh / 3.6;
        const osrmUrl = `https://router.project-osrm.org/route/v1/${profile}/${points.map(c => `${c[1]},${c[0]}`).join(';')}?overview=full&geometries=geojson&steps=true`;
        const valhallaProfile = profile === 'foot' ? 'pedestrian' : 'auto';
        const valhallaPayload = {
            costing: valhallaProfile,
            costing_options: valhallaProfile === 'auto' ? { "auto": { "use_highways": 0, "use_tolls": 0 } } : { "pedestrian": { "use_tracks": 1 } },
            locations: points.map(c => ({lat: c[0], lon: c[1]})),
            directions: { language: "es-ES", units: "kilometers" }
        };
        try {
            const [osrmRes, valhallaRes] = await Promise.all([
                fetch(osrmUrl),
                fetch('https://valhalla1.openstreetmap.de/route', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(valhallaPayload)
                })
            ]);
            const osrmData = await osrmRes.json();
            const valhallaData = await valhallaRes.json();
            let msg = `<h3>Comparación de Rutas</h3>`;
            currentMainSteps = [];
            currentAltSteps = [];
            if (osrmData.code === 'Ok') {
                const mainRoute = osrmData.routes[0];
                userPolyline = L.polyline(mainRoute.geometry.coordinates.map(c => [c[1], c[0]]), {color: 'blue', weight: 4}).addTo(map);
                currentMainSteps = parseOSRMSteps(mainRoute);
                const walkTime = formatDuration(mainRoute.distance / 1.39);
                const driveTime = formatDuration(mainRoute.distance / speedMps);
                msg += `<p>🔵 <b>Ruta Rápida (Azul):</b> ${formatDistance(mainRoute.distance)}<br>🚶 A pie: ${walkTime} | 🚗 Auto (a ${speedKmh} km/h): ${driveTime}</p>`;
            }
            if (valhallaData.trip && valhallaData.trip.legs && valhallaData.trip.legs.length > 0) {
                const encodedShape = valhallaData.trip.legs[0].shape;
                const routeCoords = decodePolyline6(encodedShape);
                if (routeCoords.length > 0) {
                    altPolyline = L.polyline(routeCoords, {color: 'orange', weight: 4, dashArray: '5, 5'}).addTo(map);
                    currentAltSteps = parseValhallaSteps(valhallaData);
                    const distMeters = valhallaData.trip.summary.length * 1000;
                    const walkTime = formatDuration(distMeters / 1.39);
                    const driveTime = formatDuration(distMeters / speedMps);
                    msg += `<p>🟠 <b>Ruta Corta (Naranja):</b> ${formatDistance(distMeters)}<br>🚶 A pie: ${walkTime} | 🚗 Auto (a ${speedKmh} km/h): ${driveTime}</p>`;
                }
            }
            if (msg === `<h3>Comparación de Rutas</h3>`) {
                msg = "No se pudieron calcular rutas para comparar.";
            }
            resDiv.innerHTML = msg;
            if (userPolyline && altPolyline) {
                map.fitBounds(L.featureGroup([userPolyline, altPolyline]).getBounds());
            } else if (userPolyline) {
                map.fitBounds(userPolyline.getBounds());
            } else if (altPolyline) {
                map.fitBounds(altPolyline.getBounds());
            }
            if (currentMainSteps.length > 0 || currentAltSteps.length > 0) {
                document.getElementById('itinerarioLista').innerHTML = (currentMainSteps.length > 0 ? currentMainSteps : currentAltSteps).map(p => `<li>${p}</li>`).join('');
                document.getElementById('itinerarioRuta').style.display = 'block';
                if (currentMainSteps.length > 0 && currentAltSteps.length > 0) {
                    document.getElementById('routeToggle').style.display = 'flex';
                    document.getElementById('btnMainRoute').innerText = "Rápida (Azul)";
                    document.getElementById('btnAltRoute').innerText = "Corta (Naranja)";
                    showItinerario('main');
                } else {
                    document.getElementById('routeToggle').style.display = 'none';
                }
            }
        } catch(e) {
            console.error("Error en compararRutasCiudad:", e);
            resDiv.innerHTML = "Hubo un error al comparar las rutas.";
        }
    }

    async function compareCiudadRoute() {
        if (!userPolyline) { alert("Dibujá tu ruta primero."); return; }
        const start = userPolyline.getLatLngs()[0];
        const end = userPolyline.getLatLngs()[userPolyline.getLatLngs().length - 1];
        const profile = document.getElementById('transporte-ciudad').value;
        const url = `https://router.project-osrm.org/route/v1/${profile}/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
        const response = await fetch(url); const data = await response.json();
        if (data.code === 'Ok') {
            if (optimalPolyline) map.removeLayer(optimalPolyline);
            optimalPolyline = L.polyline(data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]), {color: 'red', weight: 4, dashArray: '5, 5'}).addTo(map);
            const optimalDistance = data.routes[0].distance;
            const resDiv = document.getElementById('resultados');
            resDiv.style.display = 'block';
            let diff = window.userDistance - optimalDistance;
            let msg = `Tu ruta (azul): ${formatDistance(window.userDistance)}.<br>Ruta óptima (roja): ${formatDistance(optimalDistance)}.<br>`;
            if (diff > 100) msg += `Tu ruta es <b>${formatDistance(diff)} más larga</b>.`;
            else if (diff < -100) msg += `¡Tu ruta es <b>${formatDistance(Math.abs(diff))} más corta</b>!`;
            else msg += `¡Tu ruta es prácticamente igual de larga!`;
            resDiv.innerHTML += `<hr style="border-color:#7f8c8d; margin:10px 0;"><b>Comparación:</b><br> ${msg}`;
        }
    }

    let stopCounterNac = 0;
    function addStopNacional() {
        stopCounterNac++;
        const container = document.getElementById('paradas-container-nac');
        const div = document.createElement('div');
        div.className = 'stop-container';
        div.innerHTML = `
            <label>Parada ${stopCounterNac}:</label>
            <input type="text" id="stop_nac_${stopCounterNac}" placeholder="Ej: San Luis">
            <button onclick="this.previousElementSibling.remove(); this.remove();" class="btn-red btn-small" style="width:100%; margin-top:5px;">Eliminar</button>
        `;
        container.appendChild(div);
    }

    function toggleLayers() {
        if (document.getElementById('checkFuel').checked) map.addLayer(fuelLayer); else map.removeLayer(fuelLayer);
        if (document.getElementById('checkToll').checked) map.addLayer(tollLayer); else map.removeLayer(tollLayer);
        if (document.getElementById('checkRest').checked) map.addLayer(restLayer); else map.removeLayer(restLayer);
    }

    async function trazarRutaNacional() {
        clearAll();
        document.getElementById('infoRuta').style.display = 'block';
        document.getElementById('itinerarioRuta').style.display = 'none';
        document.getElementById('poisLoading').innerHTML = '<span class="loader"></span> Calculando ruta...';
        const points = [];
        let startCoords = await geocode(document.getElementById('origen-nac').value);
        if (!startCoords) { alert("Origen no encontrado."); return; }
        points.push(startCoords);
        for (let i = 1; i <= stopCounterNac; i++) {
            const stopInput = document.getElementById(`stop_nac_${i}`);
            if (stopInput && stopInput.value) {
                const stopCoords = await geocode(stopInput.value);
                if (stopCoords) points.push(stopCoords);
            }
        }
        let endCoords = await geocode(document.getElementById('destino-nac').value);
        if (!endCoords) { alert("Destino no encontrado."); return; }
        points.push(endCoords);
        const routingEngine = document.getElementById('routing-engine').value;
        try {
            if (routingEngine === 'osrm') {
                const url = `https://router.project-osrm.org/route/v1/driving/${points.map(c => `${c[1]},${c[0]}`).join(';')}?overview=full&geometries=geojson&steps=true&alternatives=true`;
                const response = await fetch(url); const data = await response.json();
                if (data.code !== 'Ok') { alert("No se pudo calcular la ruta."); return; }
                const mainRoute = data.routes[0];
                const routeCoords = mainRoute.geometry.coordinates.map(c => [c[1], c[0]]);
                routePolyline = L.polyline(routeCoords, {color: '#e74c3c', weight: 5}).addTo(map);
                currentMainSteps = parseOSRMSteps(mainRoute);
                let msg = `<p>🔴 <b>Ruta Principal (Roja):</b> ${formatDistance(mainRoute.distance)} (${formatDuration(mainRoute.duration)})</p>`;
                if (data.routes.length > 1) {
                    const altRoute = data.routes[1];
                    const altCoords = altRoute.geometry.coordinates.map(c => [c[1], c[0]]);
                    altPolyline = L.polyline(altCoords, {color: 'orange', weight: 5, dashArray: '5, 5'}).addTo(map);
                    currentAltSteps = parseOSRMSteps(altRoute);
                    msg += `<p>🟠 <b>Ruta Alternativa (Naranja):</b> ${formatDistance(altRoute.distance)} (${formatDuration(altRoute.duration)})</p>`;
                } else {
                    currentAltSteps = [];
                }
                document.getElementById('infoRutaContent').innerHTML = msg;
                if (altPolyline) {
                    map.fitBounds(L.featureGroup([routePolyline, altPolyline]).getBounds(), { padding: [50, 50] });
                } else {
                    map.fitBounds(routePolyline.getBounds(), { padding: [50, 50] });
                }
                document.getElementById('itinerarioLista').innerHTML = currentMainSteps.map(p => `<li>${p}</li>`).join('');
                document.getElementById('itinerarioRuta').style.display = 'block';
                if (currentAltSteps.length > 0) {
                    document.getElementById('routeToggle').style.display = 'flex';
                    document.getElementById('btnMainRoute').innerText = "Ruta Principal";
                    document.getElementById('btnAltRoute').innerText = "Alternativa";
                    showItinerario('main');
                } else {
                    document.getElementById('routeToggle').style.display = 'none';
                }
            } else { 
                const payload = {
                    costing: "auto",
                    costing_options: { "auto": { "use_highways": 0, "use_tolls": 0 } },
                    locations: points.map(c => ({lat: c[0], lon: c[1]})),
                    directions: { language: "es-ES", units: "kilometers" }
                };
                const response = await fetch('https://valhalla1.openstreetmap.de/route', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await response.json();
                if (data.trip && data.trip.legs && data.trip.legs.length > 0) {
                    const encodedShape = data.trip.legs[0].shape;
                    const routeCoords = decodePolyline6(encodedShape);
                    if (routeCoords.length > 0) {
                        routePolyline = L.polyline(routeCoords, {color: '#e74c3c', weight: 5}).addTo(map);
                        currentMainSteps = parseValhallaSteps(data);
                        currentAltSteps = [];
                        const distMeters = data.trip.summary.length * 1000;
                        const timeSec = data.trip.summary.time;
                        let msg = `<p>🔴 <b>Ruta Más Corta (Roja):</b> ${formatDistance(distMeters)} (${formatDuration(timeSec)})</p>`;
                        document.getElementById('infoRutaContent').innerHTML = msg;
                        map.fitBounds(routePolyline.getBounds(), { padding: [50,50] });
                        document.getElementById('itinerarioLista').innerHTML = currentMainSteps.map(p => `<li>${p}</li>`).join('');
                        document.getElementById('itinerarioRuta').style.display = 'block';
                        document.getElementById('routeToggle').style.display = 'none';
                    } else {
                        alert("Error: Valhalla devolvió una línea vacía.");
                        return;
                    }
                } else {
                    alert("No se pudo calcular la ruta más corta: " + (data.error || "Error desconocido"));
                    return;
                }
            }
            await buscarPOIsNacional();
        } catch(e) {
            console.error("Error en trazarRutaNacional:", e);
            alert("Ocurrió un error al calcular la ruta.");
        }
    }

    async function compararRutasNacionales() {
        clearAll();
        document.getElementById('infoRuta').style.display = 'block';
        document.getElementById('itinerarioRuta').style.display = 'none';
        document.getElementById('poisLoading').innerHTML = '<span class="loader"></span> Comparando rutas...';
        const points = [];
        let startCoords = await geocode(document.getElementById('origen-nac').value);
        if (!startCoords) { alert("Origen no encontrado."); return; }
        points.push(startCoords);
        for (let i = 1; i <= stopCounterNac; i++) {
            const stopInput = document.getElementById(`stop_nac_${i}`);
            if (stopInput && stopInput.value) {
                const stopCoords = await geocode(stopInput.value);
                if (stopCoords) points.push(stopCoords);
            }
        }
        let endCoords = await geocode(document.getElementById('destino-nac').value);
        if (!endCoords) { alert("Destino no encontrado."); return; }
        points.push(endCoords);
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${points.map(c => `${c[1]},${c[0]}`).join(';')}?overview=full&geometries=geojson&steps=true`;
        const valhallaPayload = {
            costing: "auto",
            costing_options: { "auto": { "use_highways": 0, "use_tolls": 0 } },
            locations: points.map(c => ({lat: c[0], lon: c[1]})),
            directions: { language: "es-ES", units: "kilometers" }
        };
        try {
            const [osrmRes, valhallaRes] = await Promise.all([
                fetch(osrmUrl),
                fetch('https://valhalla1.openstreetmap.de/route', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(valhallaPayload)
                })
            ]);
            const osrmData = await osrmRes.json();
            const valhallaData = await valhallaRes.json();
            let msg = '';
            currentMainSteps = [];
            currentAltSteps = [];
            if (osrmData.code === 'Ok') {
                const mainRoute = osrmData.routes[0];
                const routeCoords = mainRoute.geometry.coordinates.map(c => [c[1], c[0]]);
                routePolyline = L.polyline(routeCoords, {color: '#e74c3c', weight: 5}).addTo(map);
                currentMainSteps = parseOSRMSteps(mainRoute);
                msg += `<p>🔴 <b>Ruta Rápida (Roja):</b> ${formatDistance(mainRoute.distance)} (${formatDuration(mainRoute.duration)})</p>`;
            }
            if (valhallaData.trip && valhallaData.trip.legs && valhallaData.trip.legs.length > 0) {
                const encodedShape = valhallaData.trip.legs[0].shape;
                const routeCoords = decodePolyline6(encodedShape);
                if (routeCoords.length > 0) {
                    altPolyline = L.polyline(routeCoords, {color: 'orange', weight: 5, dashArray: '5, 5'}).addTo(map);
                    currentAltSteps = parseValhallaSteps(valhallaData);
                    const distMeters = valhallaData.trip.summary.length * 1000;
                    const timeSec = valhallaData.trip.summary.time;
                    msg += `<p>🟠 <b>Ruta Corta (Naranja):</b> ${formatDistance(distMeters)} (${formatDuration(timeSec)})</p>`;
                }
            }
            if (msg === '') {
                msg = "No se pudieron calcular rutas para comparar.";
            }
            document.getElementById('infoRutaContent').innerHTML = msg;
            if (routePolyline && altPolyline) {
                map.fitBounds(L.featureGroup([routePolyline, altPolyline]).getBounds(), { padding: [50, 50] });
            } else if (routePolyline) {
                map.fitBounds(routePolyline.getBounds(), { padding: [50, 50] });
            } else if (altPolyline) {
                map.fitBounds(altPolyline.getBounds(), { padding: [50, 50] });
            }
            if (currentMainSteps.length > 0 || currentAltSteps.length > 0) {
                document.getElementById('itinerarioLista').innerHTML = (currentMainSteps.length > 0 ? currentMainSteps : currentAltSteps).map(p => `<li>${p}</li>`).join('');
                document.getElementById('itinerarioRuta').style.display = 'block';
                if (currentMainSteps.length > 0 && currentAltSteps.length > 0) {
                    document.getElementById('routeToggle').style.display = 'flex';
                    document.getElementById('btnMainRoute').innerText = "Rápida (Roja)";
                    document.getElementById('btnAltRoute').innerText = "Corta (Naranja)";
                    showItinerario('main');
                } else {
                    document.getElementById('routeToggle').style.display = 'none';
                }
            }
            await buscarPOIsNacional();
        } catch(e) {
            console.error("Error en compararRutasNacionales:", e);
            alert("Ocurrió un error al comparar las rutas.");
        }
    }

    async function buscarPOIsNacional() {
        if (!document.getElementById('checkFuel').checked && !document.getElementById('checkToll').checked && !document.getElementById('checkRest').checked) {
            document.getElementById('poisLoading').innerText = "No se buscaron servicios."; return;
        }
        document.getElementById('poisLoading').innerHTML = '<span class="loader"></span> Buscando servicios...';
        let bounds;
        if (routePolyline && altPolyline) {
            let group = L.featureGroup([routePolyline, altPolyline]);
            bounds = group.getBounds().pad(0.2);
        } else if (routePolyline) {
            bounds = routePolyline.getBounds().pad(0.2);
        } else if (altPolyline) {
            bounds = altPolyline.getBounds().pad(0.2);
        } else if (userPolyline) {
            bounds = userPolyline.getBounds().pad(0.2);
        } else {
            document.getElementById('poisLoading').innerText = "No hay ruta para buscar servicios.";
            return;
        }
        const bbox = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`;
        let query = "[out:json][timeout:25];(";
        if (document.getElementById('checkFuel').checked) query += `nwr["amenity"="fuel"](${bbox});`;
        if (document.getElementById('checkToll').checked) query += `nwr["barrier"="toll_booth"](${bbox});nwr["highway"="toll_booth"](${bbox});`;
        if (document.getElementById('checkRest').checked) query += `nwr["highway"="rest_area"](${bbox});nwr["amenity"="parking"]["name"](${bbox});`;
        query += ");out center;";
        try {
            const response = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: 'data=' + encodeURIComponent(query) });
            const data = await response.json();
            let count = 0;
            data.elements.forEach(el => {
                const lat = el.lat || el.center?.lat; const lon = el.lon || el.center?.lon;
                if (lat && lon) {
                    let emoji = '📍', name = 'Servicio', target = null;
                    if (el.tags?.amenity === 'fuel') { emoji = '⛽'; name = el.tags.name || 'Estación'; target = fuelLayer; }
                    else if (el.tags?.barrier === 'toll_booth' || el.tags?.highway === 'toll_booth') { emoji = '🚧'; name = el.tags.name || 'Peaje'; target = tollLayer; }
                    else if (el.tags?.highway === 'rest_area' || el.tags?.amenity === 'parking') { emoji = '🌳'; name = el.tags.name || 'Descanso'; target = restLayer; }
                    if (target) {
                        L.marker([lat, lon], { icon: L.divIcon({ html: `<div style="font-size: 24px;">${emoji}</div>`, className: 'emoji-marker', iconSize: [30, 30], iconAnchor: [15, 15] }) }).addTo(target).bindPopup(`<strong>${emoji} ${name}</strong>`);
                        count++;
                    }
                }
            });
            document.getElementById('poisLoading').innerText = count > 0 ? `Se encontraron ${count} servicios.` : "No se encontraron servicios en esta zona.";
            toggleLayers();
        } catch (e) { document.getElementById('poisLoading').innerText = "Error al buscar servicios."; }
    }

    function estadoActual() {
        let state = {
            mode: currentMode,
            ciudadTab: currentCiudadTab,
            routingEngine: document.getElementById('routing-engine').value
        };
        if (currentMode === 'ciudad') {
            state.partida = document.getElementById('partida').value;
            state.destino = document.getElementById('destino').value;
            state.transporte = document.getElementById('transporte-ciudad').value;
            state.speedDriving = document.getElementById('speed-driving').value;
            state.steps = Array.from(document.querySelectorAll('#steps-container-ciudad .step-container')).map(s => ({
                accion: s.querySelector('.accion').value, calle: s.querySelector('.calle').value,
                cantidad: s.querySelector('.cantidad').value, unidad: s.querySelector('.unidad').value, rumbo: s.querySelector('.rumbo').value
            }));
            state.stopsIti = [];
            for (let i = 1; i <= stopCounterCiudad; i++) {
                const stopInput = document.getElementById(`stop_ciudad_${i}`);
                if (stopInput && stopInput.value) state.stopsIti.push(stopInput.value);
            }
        } else {
            state.origen = document.getElementById('origen-nac').value;
            state.destino = document.getElementById('destino-nac').value;
            state.checks = { fuel: document.getElementById('checkFuel').checked, toll: document.getElementById('checkToll').checked, rest: document.getElementById('checkRest').checked };
            state.stops = [];
            for (let i = 1; i <= stopCounterNac; i++) {
                const stopInput = document.getElementById(`stop_nac_${i}`);
                if (stopInput && stopInput.value) state.stops.push(stopInput.value);
            }
        }
        return state;
    }

    function exportJSON() {
        const state = estadoActual();
        const base = (document.getElementById('routeName').value || 'ruta').trim() || 'ruta';
        const blob = new Blob([JSON.stringify(state)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = base + '.json';
        document.body.appendChild(a);
        a.click();
        setTimeout(function() { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    }

    function importarJSON(input) {
        const f = input.files && input.files[0];
        if (!f) return;
        const rd = new FileReader();
        rd.onload = function() { cargarJSONTexto(rd.result, f.name); };
        rd.readAsText(f);
        input.value = '';
    }

    function cargarJSONTexto(texto, nombreArchivo) {
        let state = null;
        try { state = JSON.parse(texto); } catch (e) { state = null; }
        if (!state || (state.mode !== 'ciudad' && state.mode !== 'nacional')) {
            alert("Ese archivo no es una ruta RUMBO.");
            return;
        }
        let nombre = String(nombreArchivo || 'ruta').replace(/\.json$/i, '') || 'ruta';
        if (localStorage.getItem('app_state_' + nombre) && !confirm('Ya existe "' + nombre + '". ¿Reemplazar?')) return;
        localStorage.setItem('app_state_' + nombre, JSON.stringify(state));
        loadSavedStates();
        document.getElementById('savedRoutes').value = nombre;
        loadState();
        alert("¡Ruta importada!");
    }

    function saveState() {
        const name = document.getElementById('routeName').value;
        if (!name) { alert("Poné un nombre para guardar."); return; }
        let state = { 
            mode: currentMode, 
            ciudadTab: currentCiudadTab,
            routingEngine: document.getElementById('routing-engine').value 
        };
        if (currentMode === 'ciudad') {
            state.partida = document.getElementById('partida').value;
            state.destino = document.getElementById('destino').value;
            state.transporte = document.getElementById('transporte-ciudad').value;
            state.speedDriving = document.getElementById('speed-driving').value;
            state.steps = Array.from(document.querySelectorAll('#steps-container-ciudad .step-container')).map(s => ({
                accion: s.querySelector('.accion').value, calle: s.querySelector('.calle').value,
                cantidad: s.querySelector('.cantidad').value, unidad: s.querySelector('.unidad').value, rumbo: s.querySelector('.rumbo').value
            }));
            state.stopsIti = [];
            for (let i = 1; i <= stopCounterCiudad; i++) {
                const stopInput = document.getElementById(`stop_ciudad_${i}`);
                if (stopInput && stopInput.value) state.stopsIti.push(stopInput.value);
            }
        } else {
            state.origen = document.getElementById('origen-nac').value;
            state.destino = document.getElementById('destino-nac').value;
            state.checks = { fuel: document.getElementById('checkFuel').checked, toll: document.getElementById('checkToll').checked, rest: document.getElementById('checkRest').checked };
            state.stops = [];
            for (let i = 1; i <= stopCounterNac; i++) {
                const stopInput = document.getElementById(`stop_nac_${i}`);
                if (stopInput && stopInput.value) state.stops.push(stopInput.value);
            }
        }
        localStorage.setItem('app_state_' + name, JSON.stringify(state));
        alert("¡Guardado con éxito!");
        loadSavedStates();
    }

    function loadSavedStates() {
        const select = document.getElementById('savedRoutes');
        select.innerHTML = '<option value="">-- Elegir --</option>';
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('app_state_')) {
                const name = key.replace('app_state_', '');
                select.innerHTML += `<option value="${name}">${name}</option>`;
            }
        }
    }

    function loadState() {
        const name = document.getElementById('savedRoutes').value;
        if (!name) return;
        const state = JSON.parse(localStorage.getItem('app_state_' + name));
        if(state.routingEngine) document.getElementById('routing-engine').value = state.routingEngine;
        if (state.mode === 'ciudad') {
            switchMode('ciudad', { target: document.querySelectorAll('.mode-btn')[0] });
            if (state.ciudadTab === 'itinerario') {
                switchCiudadTab('itinerario', { target: document.querySelectorAll('#view-ciudad .sub-btn')[1] });
                document.getElementById('stops-container-ciudad').innerHTML = '';
                stopCounterCiudad = 0;
                state.stopsIti.forEach(stop => { addStopCiudadIti(); document.querySelector(`#stop_ciudad_${stopCounterCiudad}`).value = stop; });
            } else {
                switchCiudadTab('pasos', { target: document.querySelectorAll('#view-ciudad .sub-btn')[0] });
                document.getElementById('partida').value = state.partida;
                document.getElementById('destino').value = state.destino;
                document.getElementById('transporte-ciudad').value = state.transporte;
                if(state.speedDriving) document.getElementById('speed-driving').value = state.speedDriving;
                document.getElementById('steps-container-ciudad').innerHTML = '';
                state.steps.forEach(s => {
                    addStepCiudad();
                    const last = document.querySelector('#steps-container-ciudad .step-container:last-child');
                    last.querySelector('.accion').value = s.accion; last.querySelector('.calle').value = s.calle;
                    last.querySelector('.cantidad').value = s.cantidad; last.querySelector('.unidad').value = s.unidad; last.querySelector('.rumbo').value = s.rumbo;
                });
            }
            drawCiudadRoute();
        } else {
            switchMode('nacional', { target: document.querySelectorAll('.mode-btn')[1] });
            document.getElementById('origen-nac').value = state.origen;
            document.getElementById('destino-nac').value = state.destino;
            document.getElementById('checkFuel').checked = state.checks.fuel;
            document.getElementById('checkToll').checked = state.checks.toll;
            document.getElementById('checkRest').checked = state.checks.rest;
            document.getElementById('paradas-container-nac').innerHTML = '';
            stopCounterNac = 0;
            state.stops.forEach(stop => { addStopNacional(); document.querySelector(`#stop_nac_${stopCounterNac}`).value = stop; });
            trazarRutaNacional();
        }
    }

    function deleteState() {
        const name = document.getElementById('savedRoutes').value;
        if (!name) return;
        if (confirm(`¿Borrar "${name}"?`)) {
            localStorage.removeItem('app_state_' + name);
            loadSavedStates();
        }
    }

    function extremosRuta() {
        const linea = (typeof userPolyline !== 'undefined' && userPolyline) || (typeof routePolyline !== 'undefined' && routePolyline);
        if (!linea) return null;
        let pts = linea.getLatLngs();
        if (pts.length && Array.isArray(pts[0])) pts = pts.flat();
        if (!pts || pts.length < 2) return null;
        const f = pts[0], l = pts[pts.length - 1];
        const fmt = (p) => p.lat.toFixed(5) + ',' + p.lng.toFixed(5);
        return [fmt(f), fmt(l)];
    }

    function verEnOSM() {
        const r = extremosRuta();
        if (!r) { alert("Dibujá una ruta primero."); return; }
        window.open('https://www.openstreetmap.org/directions?from=' + r[0] + '&to=' + r[1], '_blank');
    }

    function verEnGoogle() {
        const r = extremosRuta();
        if (!r) { alert("Dibujá una ruta primero."); return; }
        let modo = 'driving';
        try {
            if (currentMode === 'ciudad' && document.getElementById('transporte-ciudad').value === 'foot') modo = 'walking';
        } catch (e) {}
        window.open('https://www.google.com/maps/dir/?api=1&origin=' + r[0] + '&destination=' + r[1] + '&travelmode=' + modo, '_blank');
    }

    function exportToPDF() {
        const element = document.getElementById('app');
        const opt = { margin: 0, filename: 'mi-app-mapa.pdf', image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' } };
        alert("Generando PDF...");
        html2pdf().set(opt).from(element).save();
    }

    loadSavedStates();
