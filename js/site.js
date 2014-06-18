var findme_map = L.map('findme-map')
    .setView([37.7, -97.3], 3),
    osmUrl = 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    osmAttrib = 'Map data © OpenStreetMap contributors',
    osm = L.tileLayer(osmUrl, {minZoom: 2, maxZoom: 18, attribution: osmAttrib}).addTo(findme_map),
    category_data = [];

// Check if user is on business page or home/address page
var addr = location.pathname.match(/address/) ? true : false;

var findme_marker = L.marker([0,0], {draggable:true}).addTo(findme_map);
findme_marker.setOpacity(0);

if (location.hash) location.hash = '';

// only need categories.json if finding a business
if (!addr){
    $.ajax('/categories.json').success(function(data){
        category_data = data;
    });
}

$("#category").select2({
    query: function (query) {
        var data = {results: []}, i;
        for (i = 0; i < category_data.length; i++) {
            if (query.term.length === 0 || category_data[i].toLowerCase().indexOf(query.term.toLowerCase()) >= 0) {
                data.results.push({id: category_data[i], text: category_data[i]});
            }
        }
        query.callback(data);
    }
});

$("#find").submit(function(e) {
    e.preventDefault();
    $("#couldnt-find").hide();
    var address_to_find = $("#address").val();
    if (address_to_find.length === 0) return;
    var qwarg = {
        format: 'json',
        q: address_to_find
    };
    var url = "http://nominatim.openstreetmap.org/search?" + $.param(qwarg);
    $("#findme h4").text("Searching...");
    $("#findme").addClass("loading");
    $.getJSON(url, function(data) {
        if (data.length > 0) {
            var chosen_place = data[0];
            console.log(chosen_place);

            var bounds = new L.LatLngBounds(
                [+chosen_place.boundingbox[0], +chosen_place.boundingbox[2]],
                [+chosen_place.boundingbox[1], +chosen_place.boundingbox[3]]);

            findme_map.fitBounds(bounds);

            findme_marker.setOpacity(1);
            findme_marker.setLatLng([chosen_place.lat, chosen_place.lon]);
            var successMessage = !addr ? 'We found it! Click and drag the marker to sit on your business, then you are ready to <a href="#details">add details to your business listing</a>.' : 'We found your general vicinity! Click and drag the marker to sit on your home or business, then you are ready to <a href="#details">refine your address</a>.';
            $('#instructions').html(successMessage);
            if (addr){
                $('#address-welcome').html('Ah ha!')
            }
            $('.step-2 a').attr('href', '#details');
        } else {
            var failureMessage = !addr ? '<strong>We couldn\'t find your address.</strong> Try searching for your street or city without the address.' : '<strong>We couldn\'t find your street.</strong> Try searching for your city without the address or street.';
            $('#instructions').html(failureMessage);
            if (addr){
                $('#address-welcome').html('Hrrm...')
            }
        }
        $("#findme").removeClass("loading");
    });
});

$(window).on('hashchange', function() {
    if (location.hash == '#details') {
        $('#collect-data-step').removeClass('hide');
        $('#address-step').addClass('hide');
        $('#confirm-step').addClass('hide');
        $('.steps').addClass('on-2');
        $('.steps').removeClass('on-3');
    } else if (location.hash == '#done') {
        $('#confirm-step').removeClass('hide');
        $('#collect-data-step').addClass('hide');
        $('#address-step').addClass('hide');
        $('.steps').addClass('on-3');
    } else {
        $('#address-step').removeClass('hide');
        $('#collect-data-step').addClass('hide');
        $('#confirm-step').addClass('hide');
        $('.steps').removeClass('on-2');
        $('.steps').removeClass('on-3');
    }
    findme_map.invalidateSize();
});

$("#collect-data-done").click(function() {
    location.hash = '#done';

    var note_body = !addr ? 
        "onosm.org submitted note from a business:\n" +
        "name: " + $("#name").val() + "\n" +
        "phone: " + $("#phone").val() + "\n" +
        "website: " + $("#website").val() + "\n" +
        "twitter: " + $("#twitter").val() + "\n" +
        "hours: " + $("#opening_hours").val() + "\n" +
        "category: " + $("#category").val() + "\n" +
        "address: " + $("#address").val() 
        : 
        "onosm.org submitted note for a home address:\n" + 
        "number: " + $("#number").val() + "\n" +
        "street: " + $("#street").val() + "\n" +
        "city: " + $("#city").val() + "\n" +
        "postal_code: " + $("#postal_code").val() + "\n",
        latlon = findme_marker.getLatLng(),
        qwarg = {
            lat: latlon.lat,
            lon: latlon.lng,
            text: note_body
        };

    $.post('http://api.openstreetmap.org/api/0.6/notes.json', qwarg);
});
