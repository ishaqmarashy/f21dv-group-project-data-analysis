export default class Histogram{

    // Object properties
    width; height; margin;
    svg; chart; bars; axisX; axisY; labelX; labelY;
    scaleX; scaleY;
    data;bins;

    // Constructor: setup size and selections
    // Parameters: selector, width, height, [top,bottom,left,right]margin
    constructor(container, width, height, margin){
        // Store the dimensions and margins of the chart for later calculations
        this.width = width;
        this.height = height;
        this.margin = margin; // Expected as an array [top, right, bottom, left]
    
        // Create an SVG element within the specified container with a 'viewBox' attribute for responsive sizing
        this.svg = d3.select(container).append('svg')
            .classed('histogram-vis', true) // Add a class for styling
            .attr('viewBox', `0 0 ${this.width} ${this.height}`)
            .attr('preserveAspectRatio', 'xMidYMid meet') // This keeps the aspect ratio during scaling
            .style('width', '100%') // Make the SVG width responsive
            .style('height', 'auto'); // Adjust the height automatically based on the aspect ratio
    
        // Append a <g> element to the SVG to hold the bars of the histogram, positioning it according to margins
        this.chart = this.svg.append('g')
            .attr('transform', `translate(${this.margin[3]},${this.margin[0]})`);
        // Initialize a selection for bars that will be created later
        this.bars = this.chart.selectAll('rect.bar');
    
        // Append <g> elements for the X and Y axes, positioning them within the SVG container
        this.axisX = this.svg.append('g')
            .attr('transform', `translate(${this.margin[3]},${this.height-this.margin[2]})`);
        this.axisY = this.svg.append('g')
            .attr('transform', `translate(${this.margin[3]},${this.margin[0]})`);
    
        // Append text elements for the X and Y axis labels, positioning them at the center of each axis
        this.labelX = this.svg.append('text')
            .classed('legend', true) // Add a class for styling
            .attr('transform', `translate(${this.width/2},${this.height})`) // Position at the bottom center for the X label
            .style('text-anchor', 'middle') // Center the text horizontally
            .attr('dy',-5); // Adjust position slightly above the bottom edge
    
        this.labelY = this.svg.append('text')
            .classed('legend', true) // Add a class for styling
            .attr('transform', `translate(0,${this.height/2})rotate(-90)`) // Position at the center left and rotate for the Y label
            .style('text-anchor', 'middle') // Center the text vertically after rotation
            .attr('dy',15); // Adjust position slightly right of the left edge
    }
    

    // Private methods
    #updateScales(){
        let chartWidth = this.width-this.margin[2]-this.margin[3],
            chartHeight = this.height-this.margin[0]-this.margin[1];
        let rangeX = [0, chartWidth],
            rangeY = [chartHeight, 0];
        let domainX = [d3.min(this.data, d=>d[1]), d3.max(this.data, d=>d[2])],
            domainY = [0, d3.max(this.data, d=>d[0])];
        this.scaleX = d3.scaleLinear(domainX, rangeX);
        this.scaleY = d3.scaleLinear(domainY, rangeY).nice();
    }

    #updateAxes(){
        let axisGenX = d3.axisBottom(this.scaleX),
            axisGenY = d3.axisLeft(this.scaleY).tickFormat(d3.format('.0%'));
        this.axisX.call(axisGenX);
        this.axisY.call(axisGenY);
    }

    #updateBars(){
        this.bars = this.chart.selectAll('rect.bar').remove(); 
        this.bars = this.chart.selectAll('rect.bar')
            .data(this.data, d => d[0])
            .join('rect')
            .classed('bar', true)
            .attr('x', d => this.scaleX(d[1]) + 0.5)
            .attr('height', d => this.scaleY(0) - this.scaleY(d[0]))
            .attr('width', d => this.scaleX(d[2]) - this.scaleX(d[1]) - 1)
            .attr('y', d => this.scaleY(d[0]))
            .style("fill", "#9ecae1").on('mouseover',d=>console.log(d.target));
    }
    
    // Public API

    // dataset should be in the format [v,...]
    render(dataset, thresholds=40){
        this.bins=thresholds;
        // bin generator
        let binGen = d3.bin().thresholds(thresholds);
        // generate data: [[ratio, bin_lower, bin_uppper], ...]
        this.data = binGen(dataset).map(d=>[d.length/dataset.length,d.x0,d.x1]);
        this.#updateScales();
        this.#updateBars();
        this.#updateAxes();
        return this;
    }

    setLabels(labelX='values', labelY='frequencies'){
        this.labelX.text(labelX);
        this.labelY.text(labelY);
        return this;
    }
}