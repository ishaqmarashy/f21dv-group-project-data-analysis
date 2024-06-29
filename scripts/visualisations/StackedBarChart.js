export default class BarChart {

    // Object properties
    width; height; margin;
    svg; chart; bars; axisX; axisY; labelX; labelY;
    scaleX; scaleY;
    data;
    group;
    stacked;
    colorScale;

    // format when displaying values
    // 3 significant digits, remove trailing zeros, use SI preffix
    axisYFormat = d3.format('.3~s');

    // Constructor: setup size and selections
    // Parameters: selector, width, height, [top,bottom,left,right]margin
    constructor(container, width, height, margin) {
        this.width = width;
        this.height = height;
        this.margin = margin;
        this.svg = d3.select(container).append('svg')
            .classed('stackedBar-vis', true)
            .attr('viewBox', `0 0 ${this.width} ${this.height}`)
            .attr('preserveAspectRatio', 'xMidYMid meet') // This keeps the aspect ratio during scaling
            .style('width', '100%') // Make the SVG width responsive
            .style('height', 'auto'); // Adjust the height automatically based on the aspect ratio
        this.chart = this.svg.append('g')
            .attr('transform', `translate(${this.margin[2]},${this.margin[0]})`);
        this.axisX = this.svg.append('g')
            .attr('transform', `translate(${this.margin[2]},${this.height - this.margin[1]})`);
        this.axisY = this.svg.append('g')
            .attr('transform', `translate(${this.margin[2]},${this.margin[0]})`);
        this.labelX = this.svg.append('text').classed('legend', true)
            .attr('transform', `translate(${this.width / 2},${this.height})`)
            .style('text-anchor', 'middle').attr('dy', 0);
        this.labelY = this.svg.append('text').classed('legend', true)
            .attr('transform', `translate(0,${this.height / 2})rotate(-90)`)
            .style('text-anchor', 'middle').attr('dy', 15);
    }

    // Private methods
    #updateScales() {
        let chartWidth = this.width - this.margin[2] - this.margin[3],
            chartHeight = this.height - this.margin[0] - this.margin[1];
        let rangeX = [0, chartWidth],
            rangeY = [chartHeight, 0];
        let domainX = this.data.map(d => d[this.group]),
        // Y domain is dependent on the sum of the stacked classes in the data 
            domainY = [0, d3.max(this.data, d => d3.sum(d3.map(this.stacked,x=>d[x])))];
        // bandscale used to space items evenly on the x axis such as cities (categorical column)
        this.scaleX = d3.scaleBand(domainX, rangeX).padding(0.2);
        // linear scale to show consistant change on the y axis (as opposed to logerithmic or exponential change)
        this.scaleY = d3.scaleLinear(domainY, rangeY);
    }

    #updateLegend() {
        // Constants for legend sizing
        const legendRectSize = 12; // The size of the legend color squares
        const legendSpacing = 4;  // The spacing between legend items
        const legendXOffset = -50; // Adjust this to position your legend inside the chart area
    
        // Create a group for the legend if it doesn't exist
        let legend = this.chart.selectAll('.legend')
            .data(this.colorScale.domain());
    
        // Update existing legend items (useful if updating the chart with new data)
        legend.selectAll('rect')
            .attr('fill', this.colorScale);
    
        legend.selectAll('text')
            .text(d => d);
    
        // Create new legend items
        const legendEnter = legend.enter()
            .append('g')
            .attr('class', 'legend');
    
        legendEnter.append('rect')
            .attr('x', this.width - legendRectSize + legendXOffset)
            .attr('y', (d, i) => i * (legendRectSize + legendSpacing))
            .attr('width', legendRectSize)
            .attr('height', legendRectSize)
            .attr('fill', this.colorScale);
    
        legendEnter.append('text')
            .attr('x', this.width - legendRectSize + legendXOffset - 5) // Padding between rect and text
            .attr('y', (d, i) => i * (legendRectSize + legendSpacing) + legendRectSize / 2)
            .attr('dy', '0.35em') // Vertically center text
            .style('text-anchor', 'end')
            .style('font-size', '10px') // Smaller font size for the legend text
            .text(d => d.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase()));
    
        // Remove old legend items
        legend.exit().remove();
    }
    


    #updateAxes() {
        let axisGenX = d3.axisBottom(this.scaleX),
            axisGenY = d3.axisLeft(this.scaleY).tickFormat(this.axisYFormat);
        this.axisX.call(axisGenX);
        this.axisY.transition().duration(500).call(axisGenY);
    }


    #updateBars() {
        // stack the data
        // d3 uses the keys to create points that can be used to generate rects points
        // ex where category 1 in a city starts and ends and where category 2 starts and ends
        let stackedData = d3.stack().keys(this.stacked)(this.data);
        stackedData.forEach((group, i) => {
            group.forEach((dataPoint, j) => {
                stackedData[i][j].key=group.key
            });
        });
        // add rects to the bar chart
        this.chart.selectAll(".bar-group")
        .data(stackedData)
        .join("g")
        .attr("class", "bar-group")
        // the key here is the category(row) the city (column) is stacking on
        // it would be room type for this graph
        // room type determines the color by a categorical color scale
        .attr("fill", d => this.colorScale(d.key))
        .selectAll("rect")
        .data(d=>d)
        .join("rect")
        .attr("class", "bar")
        .attr("x", d => this.scaleX(d.data[this.group]))
        .attr("y", d => this.scaleY(d[1]))
        .attr("width", this.scaleX.bandwidth())
        .attr("height", d => this.scaleY(d[0]) - this.scaleY(d[1]))
        // appending title and text allows for a browser native tooltip
        // replace removes underscore and places a space and then makes sure every word starts with an uppercase
        .append('title').text(d=>{
            const key = d.key.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
            // round value to 2 decimal places
            return `${key} ${d3.format('.2f')(d[1] - d[0])}`;
        })
    }

    // color the stacked bar based on stacking key (room type) by order
    #updateColorScale() {
        this.colorScale = d3.scaleOrdinal()
            .domain(this.stacked)
            .range(d3.schemeBlues[3]);
    }

    // Public API
    // dataset should be in the format [[k,v],...]
    // the way it should be grouped and how its stacked
    render(dataset,group,stacked) {
        this.data = dataset;
        this.group=group;
        this.stacked=stacked;
        this.#updateColorScale();
        this.#updateScales();
        this.#updateLegend(); // Add this line to update the legend
        this.#updateBars();
        this.#updateAxes();
        return this;
    }

    setLabels(labelX = 'categories', labelY = 'values') {
        this.labelX.text(labelX);
        this.labelY.text(labelY);
        return this;
    }

    // allow an optional tag to set on bars, e.g., 'selected'
    highlightBars(keys = [], tag = 'highlighted') {
        this.chart.selectAll(".bar").classed(tag, false);
        this.chart.selectAll(".bar")
            .filter(d => keys.includes(d[this.group]))
            .classed(tag, true);
        return this;
    }
}
