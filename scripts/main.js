'use strict';

console.log(`D3 loaded, version ${d3.version}`);




// Module imports
import Maps from "./visualisations/Maps.js";
import PieChart from "./visualisations/Pie.js";
import BarChart from "./visualisations/BarChart.js";
import StackedBarChart from "./visualisations/StackedBarChart.js";
import Statistic from "./visualisations/Statistic.js";
import ScatterPlot from "./visualisations/ScatterPlot.js";
import Histogram from "./visualisations/Histogram.js";
import ScatterPlotCombined from "./visualisations/ScatterPlotTwo.js";


// Sources
// https://github.com/leakyMirror/map-of-europe/blob/master/TopoJSON/europe.topojson
// https://shancarter.github.io/distillery/
// https://geojson.io/
// https://cartographyvectors.com/map/601-rome-rioni
// https://mapshaper.org/
// https://d3js.org/
// https://d3-graph-gallery.com/
// Heriot-Watt Provided Code
// -----------------------------------Data loading and preprocessing------------------------------
const topojsonDir='../data/topojson/';
const data = await d3.csv("../data/F21DV_data.csv", (d) => {
    // for each row d, return a new object
    return {
        city: d.city,
        realSum: +d.realSum,
        room_type: d.room_type,
        room_shared: d.room_shared==="True",
        room_private: d.room_private==="True",
        host_is_superhost: d.host_is_superhost==="True",
        person_capacity: +d.person_capacity,
        multi: +d.multi===1,
        biz: +d.biz===1,
        cleanliness_rating: +d.cleanliness_rating,
        guest_satisfaction_overall: +d.guest_satisfaction_overall, 
        bedrooms: +d.bedrooms, 
        dist: +d.dist,
        metro_dist: +d.metro_dist,
        attr_index: +d.attr_index,
        rest_index: +d.rest_index,
        lat: +d.lat,
        lng: +d.lng,
        day_status: d.day_status,
        attr_index_norm: +d.attr_index_norm,
        rest_index_norm: +d.rest_index_norm,
    };
});

// calculated city locations and averages for each feature
const avgLatLng = d3.flatRollup(
    data,
    v => ({
        lat: d3.mean(v, d => d.lat),
        lng: d3.mean(v, d => d.lng),
        realSum: d3.mean(v, d => d.realSum),
        room_shared: d3.mean(v, d => d.room_shared ? 1 : 0),
        room_private: d3.mean(v, d => d.room_private ? 1 : 0),
        host_is_superhost: d3.mean(v, d => d.host_is_superhost ? 1 : 0),
        person_capacity: d3.mean(v, d => d.person_capacity),
        multi: d3.mean(v, d => d.multi ? 1 : 0),
        biz: d3.mean(v, d => d.biz ? 1 : 0),
        cleanliness_rating: d3.mean(v, d => d.cleanliness_rating),
        guest_satisfaction_overall: d3.mean(v, d => d.guest_satisfaction_overall), 
        bedrooms: d3.mean(v, d => d.bedrooms), 
        dist: d3.mean(v, d => d.dist),
        metro_dist: d3.mean(v, d => d.metro_dist),
        attr_index: d3.mean(v, d => d.attr_index),
        rest_index: d3.mean(v, d => d.rest_index),
        attr_index_norm: d3.mean(v, d => d.attr_index_norm),
        rest_index_norm: d3.mean(v, d => d.rest_index_norm),
    }),
    d => d.city
);

// flatten data
const calculatedCenters = avgLatLng.map(([city, values]) => ({
    city: city,
    lat: values.lat,
    lng: values.lng,
    realSum: values.realSum,
    room_shared: values.room_shared,
    room_private: values.room_private,
    host_is_superhost: values.host_is_superhost,
    person_capacity: values.person_capacity,
    multi: values.multi,
    biz: values.biz,
    cleanliness_rating: values.cleanliness_rating,
    guest_satisfaction_overall: values.guest_satisfaction_overall,
    bedrooms: values.bedrooms,
    dist: values.dist,
    metro_dist: values.metro_dist,
    attr_index: values.attr_index,
    rest_index: values.rest_index,
    attr_index_norm: values.attr_index_norm,
    rest_index_norm: values.rest_index_norm,
}));

//-------------------------------------TopoJson Loading------------------------------------------- 
// holds names for the cities and their topojson file names mapped
// some topojsons were too hard to find
// Rome map is partial only and a premade lisbon topojson wasnt 
const topoCityMap = {
    "Amsterdam": 'amsterdam_21',
    "Berlin": 'berlin_',
    "London": 'london_421',
    "Paris": 'paris_',
    "Rome": 'Rome',//improper 
    "Vienna": 'vienna_',
    "Barcelona": 'barcelona_1191',
    "Budapest": 'varosreszek',
    // cant find maps
    // "Lisbon": 'rome-rioni_',
    "Athens": 'Athens',
};
//-----------------------------------Helper Functions and Buttons--------------------------------- 
// Remove pie chart Buttons
async function clearPieButtons() {
    d3.selectAll('#pie > div.pie_filter_container').remove();
}

// Function to create pie chart buttons for different filters
function addPieButtons(donut, data) {
    // Define the button options based on city selection
    const pieOptions = ['city', 'room_type', 'day_status', 'host_is_superhost', 'bedrooms'];
    
    // Select the pie chart container and add a div to hold the buttons if it doesn't already exist
    const pieContainer = d3.select('#pie');
    let pieFilterContainer = pieContainer.select('.pie_filter_container');

    // Remove any existing buttons to prevent duplication
    if (!pieFilterContainer.empty()) {
        pieFilterContainer.remove();
    }

    // Create a new container for the pie filter buttons
    pieFilterContainer = pieContainer.append('div')
        .attr('class', 'pie_filter_container');

    // Append a button for each filter option
    pieOptions.forEach(option => {
        pieFilterContainer.append('button')
            .text(formatOptionText(option)) // Format the button text to be human-readable
            .attr('class', 'pie_filter_button') // Use a new class for specific styling
            .on('click', () => {
                // When a button is clicked, update the donut chart with the new data
                const rolledUpData = d3.rollups(data, v => v.length, d => d[option]);
                donut.render(rolledUpData);
            });
    });
}

// Helper function to format text, replacing underscores with spaces and capitalizing words
function formatOptionText(text) {
    return text.replace(/_/g, ' ')
               .replace(/\b\w/g, char => char.toUpperCase());
}


// add clear map button and and zoom out to show pin map
// position it top left
async function addMapButtons() {
    d3.select('#map')
    .append('div')
    .classed('clear_container',true)
    .style('position', 'relative')
    .append('button')
    .text('Back')
    .style('position', 'absolute')
    .style('display', 'block')
    .style('top', `${-460}px`)
    .attr('id', 'Back')
    .on('click',()=>start(data));
}

async function clearMapButtons() {
    d3.select('#Back').remove()
}

//-------------------------------------Map Plotting------------------------------------------- 
// tables that will be used to display map tooltip
const TTcolumnNames = [
    'realSum',
    'room_type',
    'room_shared',
    'room_private',
    'person_capacity',
    'host_is_superhost',
    // 'multi',
    // 'biz',
    'cleanliness_rating',
    'guest_satisfaction_overall',
    'bedrooms',
    'dist',
    'metro_dist',
    'attr_index',
    'rest_index',
    // 'lng',
    // 'lat',
    // 'day_status',
    // 'city'
];

// renders pin map 
async function pinMap(){
    // use europe topojson
    const topoRegions = await d3.json(topojsonDir+'europe.json');
    // create toporegions and render
    const regions = topojson.feature(topoRegions, topoRegions.objects.europe);
    mapRegions.baseMap(regions, d3.geoWinkel3).render(calculatedCenters,TTcolumnNames);
}

// create scatter map according to city and filtered data
async function scatterMap(city,filteredData){
    // get topojson filename
    const fileName = topoCityMap[city];
    // get dir using filename
    const path = topojsonDir + fileName + ".json";
    const topoRegions = await d3.json(path);
    // create toporegions and render
    const regions = topojson.feature(topoRegions, topoRegions.objects[fileName]);
    mapRegions.baseMap(regions, d3.geoWinkel3).render(filteredData,TTcolumnNames,true);
}

// Function to add PinMap
async function start(data) {
    document.getElementById('loader-container').style.display = 'flex'; // Use flex to center the spinner
    // Default states of Maps
    inCity =false
    // Update Map and its buttons
    await clearMapButtons();
    await pinMap();
    if (data.length === 0) {
        // Render statistics with default values if there is no data
        alert('No Airbnb available.');
        statistic1.render(0, 'Available Rentals');
        statistic2.render('€0.00', 'Average Price');
        statistic3.render('0.00%', 'Average Satisfaction');
        
        // Hide/Display accordingly
        d3.select('#histogram').style('display', 'none');
        d3.select('#pie').style('display', 'none');
        d3.select('#areaChart').style('display', 'none');
        d3.select('#stackedAreaChart').style('display', 'none');
        d3.select('#scatterPlotCard').style('display', 'none');
        d3.select('#scatterPlot1').style('display', 'none');
        d3.select('#scatterPlot2').style('display', 'none');
        d3.select('#barChartCard').style('display', 'none');
        d3.select('#stackedBar2Card').style('display', 'none');
        d3.select('#stackedBarChart').style('display', 'none');
        document.getElementById('loader-container').style.display = 'none';
        return;
    }
    // Update data in donut chart
    const room_type = d3.sort(d3.rollups(data, v => v.length, d => d.room_type),
                        (a,b)=> d3.ascending(a[0], b[0]));
    donut.render(room_type);
    // Update donut buttons
    await clearPieButtons();
    await addPieButtons(donut,data);
    // Update bar chart
    bar.setLabels('Room Type', 'Number of Rooms').render(room_type);
    // Update stacked bar chart
    stackedBar.render(calculatedCenters,'city',['dist','metro_dist']);
    stackedBar.setLabels('City','Distance (km)');
    // Update second stacked bar chart
    const avg_room = d3.flatRollup(data, v=>d3.mean(v,d=>d.realSum), d=>d.city, d=>d.room_type);
    const formatted_avg_room = d3.map(avg_room,d=>({avg:d[2],city:d[0],room_type:d[1]}));
    const cities= new Set(d3.map(formatted_avg_room,d=>d.city));
    const room_types= new Set(d3.map(formatted_avg_room,d=>d.room_type));
    let  reformatted_avg_room=[]
    cities.forEach(city => {
        let set = { city: city };
        let filtered = formatted_avg_room.filter(d => d.city === city); 
        filtered.forEach(room => {
            set[room.room_type] = room.avg;
        });
        reformatted_avg_room.push(set); 
    });

    // Group and calculate data to plot guest satisfication and cleanliness rating
    const groupedStackData = d3.group(data, d => d.city, d => d.cleanliness_rating, d => d.guest_satisfaction_overall);
    const RatingsData = Array.from(groupedStackData, ([city, cleanlinessRatings]) => {
    // group the city by the cleanliness rating and guest satisfaction ratings
    const cleanlinessData = Array.from(cleanlinessRatings, ([cleanlinessRating, guestSatisfactionRatings]) => {
        const guestSatisfactionData = Array.from(guestSatisfactionRatings, ([guestSatisfaction, values]) => ({
    // calculate the airbnb price of each cleanliness rating and guest satisfication rating for each city
        cleanliness_rating: Number(cleanlinessRating),
        guest_satisfaction_overall: Number(guestSatisfaction),
        SumrealSum: d3.sum(values, d => d.realSum)
        }));
        return guestSatisfactionData;
    }).flat();
    return cleanlinessData.flat().map(d => ({ city, ...d }));
    }).flat();

    const plot1 = {
        x: 'guest_satisfaction_overall',
        y: 'cleanliness_rating',
        size: 'SumrealSum'
    };

    scatterPlotCombined1.setData(RatingsData).render(plot1).createColorLegend();;
    
    scatterPlotCombined1.setLabels('Guest Satisfaction Overall', 'Cleanliness Rating');

    // Group and calculate data to plot restaurant and attraction index
    const groupedIndexedData = d3.group(data, d => d.city, d => d.attr_index_norm, d => d.rest_index_norm);
    // group the city by the restaurant index and attraction index
    const IndexData = Array.from(groupedIndexedData, ([city, attractionIndex]) => {
    const attractionIndexData = Array.from(attractionIndex, ([attractionIndex, restaurantIndex]) => {
        const restaurantIndexData = Array.from(restaurantIndex, ([restaurantIndex, values]) => ({
    // calculate the airbnb price of each attraction and restaurant index for each city
        attr_index_norm: Number(attractionIndex),
        rest_index_norm: Number(restaurantIndex),
        SumrealSum: d3.sum(values, d => d.realSum)
        }));
        return restaurantIndexData;
    }).flat();
    return attractionIndexData.flat().map(d => ({ city, ...d }));
    }).flat();
    
    const plot2 = {
        x: 'attr_index_norm',
        y: 'rest_index_norm',
        size: 'SumrealSum'
    };

    scatterPlotCombined2.setData(IndexData).render(plot2).createColorLegend();
    scatterPlotCombined2.setLabels('Attraction Index', 'Restaurant Index');

    
    stackedBar2.render(reformatted_avg_room,'city',[...room_types]);
    stackedBar2.setLabels('City','Average Price (€)');

    //  Update statistics
    const entryCount=data.length
    const avgRentalPrice=d3.flatRollup(data, v=>d3.mean(v,d=>d.realSum));
    const avgGuestSatisfactionPrice=d3.flatRollup(data, v=>d3.mean(v,d=>d.guest_satisfaction_overall));
    statistic1.render(entryCount, 'Available Rentals');
    statistic2.render('€'+d3.format(".2f")(avgRentalPrice), 'Average Price');
    statistic3.render(d3.format(".2%")(avgGuestSatisfactionPrice/100), 'Average Satisfaction');
    

    // Update Histogram 
    histogram.render(d3.map(data,d=> d.guest_satisfaction_overall),40);
    histogram.setLabels('Number of Hotels', 'Guest Satisfaction Overall');

    // Hide/Display accordingly
    d3.select('#histogram').style('display', 'block');
    d3.select('#pie').style('display', 'block');
    d3.select('#areaChart').style('display', 'block');
    d3.select('#stackedAreaChart').style('display', 'block');
    d3.select('#scatterPlotCard').style('display','none');
    d3.select('#scatterPlot1').style('display','block');
    d3.select('#scatterPlot2').style('display', 'block');
    d3.select('#barChartCard').style('display','none');
    d3.select('#stackedBar2Card').style('display','block');
    d3.select('#stackedBarChart').style('display','block');
    
    // Drill down and place map with selected city map ScatterPlot 
    // By adding listeners to pins
    d3.selectAll('.pin-group').on('click', async function(event, d) {
        // If city exist in dictionary it has a topojson and will continue
        // and all the changing charts will be updated to drill down to city
        if (d.city in topoCityMap) {
            document.getElementById('loader-container').style.display = 'flex';
            inCity =true
            const city=d.city
            // filter data by city
            const filteredData=data.filter(d => d.city === city)
            // filter count the frequency of a room type in the city and sort in an ascending order
            const room_type_filtered = d3.sort(d3.rollups(filteredData, v => v.length, d => d.room_type),
                                        (a,b)=> d3.ascending(a[0], b[0]));

            // Update Map and its buttons
            await scatterMap(city,filteredData);
            addMapButtons();

             // Update Donut chart and its buttons
            donut.render(room_type_filtered);
            await clearPieButtons();
            await addPieButtons(donut,filteredData);
            // Update Bar chart
            bar.render(room_type_filtered);
            bar.setLabels('Room Type', 'Number of Rooms');

            // update scatter plot for guest and cleanliness ratings
            const groupedFilteredData = d3.group(filteredData, d => d.city, d => d.cleanliness_rating, d => d.guest_satisfaction_overall);
            // calculate the same data as before but only for the specific city chosen
            const FilteredRatingsData = Array.from(groupedFilteredData, ([city, cleanlinessRatings]) => {
                const cleanlinessData = Array.from(cleanlinessRatings, ([cleanlinessRating, guestSatisfactionRatings]) => {
                    const guestSatisfactionData = Array.from(guestSatisfactionRatings, ([guestSatisfaction, values]) => ({
                        city: city, 
                        cleanliness_rating: Number(cleanlinessRating),
                        guest_satisfaction_overall: Number(guestSatisfaction),
                        SumrealSum: d3.sum(values, d => d.realSum)
                    }));
                    return guestSatisfactionData;
                }).flat();
                return cleanlinessData.flat();
            }).flat();

            const plot1 = {
                x: 'guest_satisfaction_overall',
                y: 'cleanliness_rating',
                size: 'SumrealSum'
            };
        
            scatterPlotCombined1.setData(FilteredRatingsData).render(plot1).createColorLegend();
            scatterPlotCombined1.setLabels('Guest Satisfaction Overall', 'Cleanliness Rating');

            const groupedIndexFilteredData = d3.group(filteredData, d => d.city, d => d.attr_index_norm, d => d.rest_index_norm);
            // calculate the same data as before but only for the specific city chosen
            const IndexFilteredData = Array.from(groupedIndexFilteredData, ([city, attractionIndexFiltered]) => {
                const attractionIndexFilteredData = Array.from(attractionIndexFiltered, ([attractionFiltered, restaurantIndexFiltered]) => {
                    const restaurantIndexFilteredData = Array.from(restaurantIndexFiltered, ([restaurantIndex, values]) => ({
                        city: city, 
                        attr_index_norm: Number(attractionFiltered),
                        rest_index_norm: Number(restaurantIndex),
                        SumrealSum: d3.sum(values, d => d.realSum)
                    }));
                    return restaurantIndexFilteredData;
                }).flat();
                return attractionIndexFilteredData.flat();
            }).flat();

            const plot2 = {
                x: 'attr_index_norm',
                y: 'rest_index_norm',
                size: 'SumrealSum'
            };
        
            scatterPlotCombined2.setData(IndexFilteredData).render(plot2).createColorLegend();
            scatterPlotCombined2.setLabels('Attraction Index', 'Restaurant Index');

            // update scatter plot for restaurant and attraction index

            // Update statistics
            const filteredEntryCount=filteredData.length
            const filteredAvgRentalPrice=d3.flatRollup(filteredData, v=>d3.mean(v,d=>d.realSum));
            const filteredAvgGuestSatisfactionPrice=d3.flatRollup(filteredData, v=>d3.mean(v,d=>d.guest_satisfaction_overall));
            statistic1.render(filteredEntryCount, 'Available Rentals');
            statistic2.render('€'+d3.format(".2f")(filteredAvgRentalPrice), 'Average Price');
            statistic3.render(d3.format(".2%")(filteredAvgGuestSatisfactionPrice/100), 'Average Satisfaction');
            // Update ScatterPlot
            scatterplot.render(d3.map(filteredData,d=>[d.dist,d.metro_dist,d.room_type])); 
            scatterplot.setLabels('Distance from Metro Station','Distance from City Centre');
            
           
            // Update Histogram
            histogram.render(d3.map(filteredData,d=> d.guest_satisfaction_overall),40);
            histogram.setLabels('Number of Hotels', 'Guest Satisfaction Overall');
            
            d3.select('#barChartCard').style('display','block');
            d3.select('#scatterPlotCard').style('display','block');
            d3.select('#scatterPlot1').style('display','block');
            d3.select('#scatterPlot2').style('display', 'block');
            d3.select('#stackedBar2Card').style('display','none');
            d3.select('#stackedBarChart').style('display', 'none');
            document.getElementById('loader-container').style.display = 'none';
        }
        // If city doesnt exist in dictionary alert is displayed
        else
            alert('No topojson for this city exists\n (we couldnt find it but data for this city exists).')
    });

    document.getElementById('loader-container').style.display = 'none';

}


//-------------------------------------Filtering------------------------------------------- 
d3.select("#filterButton").on("click", function() {
    // Get the selected values from each filter
    const priceOption = d3.select("#priceFilter").property("value");
    const dayOption = d3.select("#dayFilter").property("value");
    const occupancyOption = d3.select("#capcityFilter").property("value");
    const purposeOption = d3.select("#businessFilter").property("value");
    const bedroomOption = d3.select("#bedroomFilter").property("value");
    const roomTypeOption = d3.select("#typeFilter").property("value");
    const hostRequirementOption = d3.select("#hostFilter").property("value");
    
    // Filter the data based on the selected options
    let filteredData = data;

    // Filter by price range
    if (priceOption !== "all") {
        const [minPrice, maxPrice] = priceOption.split("-").map(Number);
        filteredData = filteredData.filter(d => d.realSum >= minPrice && d.realSum <= maxPrice);
    }
    console.log(filteredData);
    // Filter by day
    if (dayOption !== "all") {
        filteredData = filteredData.filter(d => d.day_status === dayOption);
    }

    // Filter by occupancy
    if (occupancyOption !== "all") {
        const occupants = parseInt(occupancyOption);
        filteredData = filteredData.filter(d => d.person_capacity === occupants);
    }

    // Filter by purpose
    if (purposeOption !== "all") {
        const bizReq = purposeOption === "true";
        filteredData = filteredData.filter(d => d.biz === bizReq);
    }

    // Filter by bedroom count
    if (bedroomOption !== "all") {
        const bedrooms = parseInt(bedroomOption);
        filteredData = filteredData.filter(d => d.bedrooms === bedrooms);
    }

    // Filter by room type
    if (roomTypeOption !== "all") {
        filteredData = filteredData.filter(d => d.room_type === roomTypeOption);
    }
   
    // Filter by host requirement
    if (hostRequirementOption !== "all") {
        const isSuperhost = hostRequirementOption === "true";
        filteredData = filteredData.filter(d => d.host_is_superhost === isSuperhost);
    }
    console.log(filteredData);
    // Call the start function with the filtered data
    start(filteredData);
});

document.getElementById('clearFiltersButton').addEventListener('click', clearFilters);

// Function to clear filters
function clearFilters() {
    // Clear all filter selections
    d3.select("#priceFilter").property("value", "0-20000");
    d3.select("#dayFilter").property("value", "all");
    d3.select("#capcityFilter").property("value", "all");
    d3.select("#businessFilter").property("value", "all");
    d3.select("#bedroomFilter").property("value", "all");
    d3.select("#typeFilter").property("value", "all");
    d3.select("#hostFilter").property("value", "all");
    
    // Trigger the filter button click event to reapply filters
    document.getElementById('filterButton').click();
}

function getCardSize(cardBody) {
    const width = cardBody.clientWidth;
    const height = cardBody.clientHeight;
    return [width, height];
}


const cardBody = document.querySelector('.graph-card-body');
const [initialWidth, initialHeight] = getCardSize(cardBody);

//-------------------------------------Plotting------------------------------------------- 
// Initializes plots and specifies the attachment point in the index html
const [height,width]=[300,600];
const marginPie=5;
const donut = new PieChart('#pie',width, height, [marginPie,marginPie,marginPie,marginPie]);

const marginBar=45;
const bar =new BarChart('#barChart',width, height,[marginBar,marginBar,marginBar,marginBar]);

const mapRegions = new Maps("#map", width*2.25, height*2.2);

const marginStackedBar=45;
const stackedBar = new StackedBarChart("#stackedBar", initialWidth, height, [marginStackedBar,marginStackedBar,marginStackedBar,marginStackedBar]);
const stackedBar2 = new StackedBarChart("#stackedBar2", initialWidth, height, [marginStackedBar,marginStackedBar,marginStackedBar,marginStackedBar]);

const statistic1 = new Statistic('#statisticsContainer');
const statistic2 = new Statistic('#statisticsContainer');
const statistic3 = new Statistic('#statisticsContainer');



const marginScatterPlot=45;
const scatterplot = new ScatterPlot('#scatterPlot', initialWidth, height, [marginScatterPlot,marginScatterPlot,marginScatterPlot,marginScatterPlot]);
const histogram = new Histogram('#histogram', initialWidth, height,  [marginScatterPlot,marginScatterPlot,marginScatterPlot,marginScatterPlot]);
const scatterPlotCombined1 = new ScatterPlotCombined('#scatterPlot1', initialWidth, height, [marginScatterPlot,marginScatterPlot,marginScatterPlot,marginScatterPlot]);
const scatterPlotCombined2 = new ScatterPlotCombined('#scatterPlot2', initialWidth, height, [marginScatterPlot,marginScatterPlot,marginScatterPlot,marginScatterPlot]);

let inCity=false;


start(data);