// Code from lab is referenced and re-used to create varying scatter/pin maps 
export default class Maps{
    width; height; margin;
    svg; mapGroup; pointGroup;
    projection; pathGen; toolTip;
    TTcolumnNames;
    zoom;
    extent;
    regions;
    data;
    color;
    scatter;

    // Constructor
    constructor(container, width, height){
        this.width = width;
        this.height = height;
        this.container= container;
        this.scatter= false;
        // Setting up selections
        this.svg = d3.select(container).append('svg')
            .classed('map', true)
            .attr('width', width)
            .attr('height', height);     

        // Add a white background rectangle
        this.svg.append('rect')
            .attr('width', '100%') // Span the full width of the SVG
            .attr('height', '100%') // Span the full height of the SVG
            .attr('fill', 'white') // Set the fill to white
            .attr('stroke', 'blue') // Set the outline color to blue
            .attr('stroke-width', 2) // Adjust the width of the outline as needed
            .attr('rx', 10) // Set the x-axis corner radius
            .attr('ry', 10) // Set the y-axis corner radius
            //.style('filter', 'url(#drop-shadow)'); 

        this.mapGroup = this.svg.append('g')
            .classed('map', true);
        this.pointGroup = this.svg.append('g')
            .classed('points', true);
        
        // Setting tooltip
        // Added tooltip div to float above the hovered circle/pin svg elements
        // opacity is changed to make it visible and invisible accordingly 
        // as modifying the DOM is a slow proceedure its more efficient to change and hide
        this.toolTip = d3.select(container)
        .append("div")
        .style("opacity", 0)
        .attr("class", "tooltip")

        // Setting the zoom
        this.#setZoom();

        // Make color scale to later use to add colors to circles and create a scale
        this.color= d3.scaleLinear()
            .domain([0,100]) 
            .range(d3.schemeBlues[9]);   
    }
    
    // Function to set the zoom behaviour
    #setZoom(){
        this.zoom = d3.zoom()
            .extent([[0,0], [this.width,this.height]])
            .translateExtent([[0,0], [this.width,this.height]])
            .scaleExtent([1,8])
            .on('zoom', ({transform})=>{
                // Applies transform and call render map to update zoom scales
                this.mapGroup.attr('transform', transform);
                this.pointGroup.attr('transform', transform);
            })
        this.svg.call(this.zoom)
    }

    // Function to render the base map
    #renderMap(projection){
        this.projection = projection()
            .fitSize([this.width,this.height], this.regions);
        this.pathGen = d3.geoPath()
            .pointRadius(4)
            .projection(this.projection);
        this.mapGroup.selectAll('path.regions')
            .data(this.regions.features)
            .join('path')
            .classed('regions', true)
            .attr('d', this.pathGen)
            .classed('back', d=>d.id==='IRL')
    }

    // Renders a base (background) map
    baseMap(regions=[], projection=d3.geoEqualEarth){
        this.regions = regions;
        this.#renderMap(projection);
        return this;
    }

    // Gets mouse position and changes the position and visibility of the tooltip accordingly
    #mousemove(event, toolTip) {
        const clientX = event.clientX;
        const clientY = event.clientY;
        // Moves the tooltip 10px right and 10px down from mouse position as to not obstruct what is being hovered on
        const offset = 10;
        toolTip
            // Adjusted tooltip content
            .style("left", (clientX + offset) + "px") // Adjusted left position with offset
            .style("top", (clientY + offset) + "px") // Adjusted top position with offset
            .style("opacity", 1); // Make tooltip visible
    }
    
    // When mouse leaves the circle/pin make it invisible
    #mouseleave (event,toolTip) {
        toolTip.style("opacity", 0); // Make tooltip invisible
    }
    
    // Adds a legend map (only on scatter map)
    #addColorLegend() {
        d3.select('g.legend').remove()
        const legendWidth = 50;
        const legendRectHeight = 20;
        const legendPaddingTop = 0;
        const legendRectWidth = legendWidth / 3;
        const increments=250;
        // append g to the top right 
        const legendSvg = this.svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${this.width - legendWidth},${legendPaddingTop})`);

        // generate numbers by increment and get color for those 10 values 
        // used to create svg rectangles to make a legend
        let colorVals=[];
        const n=10;
        for (let i =0; i< n; i++){
            colorVals.push([i*increments,this.color(i*increments)])
        }

        // creates g items moving a fixed rect height distance down from the initial positon
        const legend = legendSvg.selectAll('.legend')
            .data(colorVals)
            .enter()
            .append('g')
            .attr('class', 'legend')
            .attr('transform', (d, i) => `translate(0,${i * legendRectHeight+legendRectHeight})`);

        // create rect with the corresponding increment values
        // adding titles allows for a tooltip to appear when hovering on the svg element
        // which shows the approximate color related to the value the circle is holding
        legend.append('rect')
            .attr('width', legendRectWidth)
            .attr('height', legendRectHeight)
            .style('fill', d => d[1])
            .append('title') 
            .text(d => `€${d[0]+increments}`); 

        // Add text at the top start of the legend
        // to show the range desplayed on the scale 
        legendSvg.append('text')
            .attr('x', legendRectWidth/2)
            .attr('y', legendRectHeight / 2)
            .attr('dy', '0.35em')
            .style('text-anchor', 'middle')
            .style('font-weight', 'bold')
            .text('€'+colorVals[0][0]);
        
        // Add text at the bottom of the legend 
        legendSvg.append('text')
            .attr('x', legendRectWidth/2)
            .attr('y', colorVals.length*legendRectHeight+legendRectHeight*1.5)
            .attr('dy', '0.35em')
            .style('text-anchor', 'middle').style('font-weight', 'bold')
            .text('€'+(colorVals[colorVals.length-1][0]+increments));
    }
    // Reference https://d3-graph-gallery.com/graph/interactivity_tooltip.html#:~:text=Building%20tooltips%20with%20d3.js%201%20Most%20basic%20tooltip,v7%20v8%20v9%20v10%20...%205%20Examples%20
    // Three function that change the tooltip when user hover / move / leave a cell
    #mouseover(event,toolTip) {
        // the data for each circle/pin for the maps is put in the data attribute as json
        // we read it here to display in the tooltip
        const dataDict=JSON.parse(event.target.getAttribute('data'));
        // round to 2 decimal places
        const format = d3.format('.2f');
        const htmltext = this.TTcolumnNames.map(key => {
            const value = dataDict[key];
            // replace underscore with space and capitalize the start of each word
            key = key.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
            // it its not a scatter map hide 'Room Shared', 'Room Type', 'Room Private', 'Host Is Superhost' as they wont make sense to display
            if (!this.scatter && ['Room Shared', 'Room Type', 'Room Private', 'Host Is Superhost'].includes(key))
                return;
            if (typeof value === 'number')
                // Round the number using D3's format function
                return `${key}: ${format(value)}`;
            else 
                // For non-number values, just return the original value
                return `${key}: ${value}`;
        }).filter(Boolean).join('<br>');
        // add html to tooltip and make visible    
        toolTip.style("opacity", 1)
          .html(htmltext) 
      }
    
    // adds circle marks to map 
    #renderPoints() {
        // remove old points 
        d3.selectAll('g.pin-group').remove();
        const pinGroups = this.pointGroup.selectAll('g.pin-group')
            .data(this.data)
            .join('g')
            .classed('pin-group', true)
            .attr('transform', d => `translate(${this.projection([d.lng, d.lat])})`);
        // add event listeners to each point and call the appropriate event
        // managing the tool tip by hiding, revealing and moving it
        pinGroups.append("circle")
            .attr("r", 2)
            .attr("fill", d => this.color(d.realSum))
            .attr("data", d => JSON.stringify(d))
            .on("mouseover", (event) => this.#mouseover(event,this.toolTip)) // displays tooltip
            .on("mousemove", (event) =>this.#mousemove(event,this.toolTip)) // moves and displays tooltip
            .on("mouseleave", (event) =>this.#mouseleave(event,this.toolTip)); // hides tooltip
    }
    
    // adds pins to the map 
    #renderPins(){
        // remove old points and legend
        d3.selectAll('g.pin-group').remove();
        d3.selectAll('g.legend').remove();
        this.pointGroup.selectAll('g.pin-group')
            .data(this.data)
            .join('g')
            .classed('pin-group', true)
            .attr('transform', d => `translate(${this.projection([d.lng, d.lat])})`)
            .on("mouseover", (event) => this.#mouseover(event,this.toolTip)) // displays tooltip
            .on("mousemove",  (event) =>this.#mousemove(event,this.toolTip)) // moves and displays tooltip
            .on("mouseleave",  (event) =>this.#mouseleave(event,this.toolTip)) // hides tooltip
            .each(function(d) {
                // Append the pin image
                const imageSize = 20; // Width and height of the pin image
                const group= d3.select(this);
                const dataString=JSON.stringify(d)
                group.append('image')
                    .attr('href', '../images/map_pin.png') //pin image
                    .classed('pin-image', true)
                    .attr('value', d.city)
                    .attr('data', dataString)
                    .attr('width', imageSize) // Width of the pin image
                    .attr('height', imageSize) // Height of the pin image
                    .attr('x', -imageSize / 2) // Center the image horizontally
                    .attr('y', -imageSize); // Position the image above the pin point
                // Append the text below the pin
                group.append('text')
                    .classed('pin-text', true)
                    .text(d.city) // Text to be displayed
                    .attr('value', d.city)
                    .attr('data', dataString)
                    .attr('text-anchor', 'middle') 
                    .attr('dy', '0.8em')
                    .style('font-size', '0.5em')
                    .style('font-weight', 'bold');
            });
    }
    
    // Public API
    // Renders pins on the map
    // Dictionary array format dataset, tooltipcolumns, use pin or scatter map
    // Datashould contain lat,lng features 
    // Dataset should be formatted [[k,v],...]
    render(dataset,TTcolumnNames,usePins){
        // on rerender hide the tooltip
        d3.select(this.container).select('.tooltip').style("opacity", 0);
        this.data = dataset;
        this.TTcolumnNames=TTcolumnNames;
        // if use tooltip render tooltip map else scatter map
        this.scatter=usePins;
        if (usePins){
            this.#addColorLegend();
            this.#renderPoints();
        }
        else{
            this.#renderPins();
        }
        return this;
    }
}