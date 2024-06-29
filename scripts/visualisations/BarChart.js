export default class BarChart{

    // Object properties
    width; height; margin;
    svg; chart; bars; axisX; axisY; labelX; labelY;
    scaleX; scaleY;
    data;
    colorScale; 
    // format when displaying values
    // 3 significant digits, remove trailing zeros, use SI preffix
    axisYFormat = d3.format('.3~s');

    // Constructor: setup size and selections
    // Parameters: selector, width, height, [top,bottom,left,right] margin
    constructor(container, width, height, margin){
        this.width = width;
        this.height = height;
        this.margin = margin;
        this.svg = d3.select(container).append('svg')
            .classed('barchart vis', true)
            .attr('viewBox', `0 0 ${this.width} ${this.height}`)
            .attr('preserveAspectRatio', 'xMidYMid meet') // This keeps the aspect ratio during scaling
            .style('width', '100%') // Make the SVG width responsive
            .style('height', 'auto'); // Adjust the height automatically based on the aspect ratio
        this.chart = this.svg.append('g')
            .attr('transform', `translate(${this.margin[2]},${this.margin[0]})`);
        this.bars = this.chart.selectAll('rect.bar');
        this.axisX = this.svg.append('g')
            .attr('transform', `translate(${this.margin[2]},${this.height-this.margin[1]})`);
        this.axisY = this.svg.append('g')
            .attr('transform', `translate(${this.margin[2]},${this.margin[0]})`);
        this.labelX = this.svg.append('text').classed('legend', true)
            .attr('transform', `translate(${this.width/2},${this.height})`)
            .style('text-anchor', 'middle').attr('dy',0);
        this.labelY = this.svg.append('text').classed('legend', true)
            .attr('transform', `translate(0,${this.height/2})rotate(-90)`)
            .style('text-anchor', 'middle').attr('dy',15);
    }

    // Private methods
    #updateScales(){
        let chartWidth = this.width-this.margin[2]-this.margin[3],
            chartHeight = this.height-this.margin[0]-this.margin[1];
        let rangeX = [0, chartWidth],
            rangeY = [chartHeight, 0];
        let domainX = this.data.map(d=>d[0]),
            domainY = [0, d3.max(this.data, d=>d[1])];
        this.scaleX = d3.scaleBand(domainX, rangeX).padding(0.2);
        this.scaleY = d3.scaleLinear(domainY, rangeY).nice();
    }

    #updateAxes(){
        let axisGenX = d3.axisBottom(this.scaleX),
            axisGenY = d3.axisLeft(this.scaleY).tickFormat(this.axisYFormat);
        this.axisX.call(axisGenX);
        this.axisY.transition().duration(500).call(axisGenY);
    }

    #updateBars(){
        let anim = 500;
        this.bars = this.bars
            .data(this.data, d=>d[0])
            .join(
                enter=>enter.append('rect')
                    .attr('y', this.scaleY(0))
                    .attr('height', 0)
                    .attr('x', d=>this.scaleX(d[0]))
            .attr('width', this.scaleX.bandwidth()),
                update=>update,
                exit=>exit.transition().duration(anim)
                    .attr('y', this.scaleY(0))
                    .attr('height', 0)
                    .remove()
            )
            .classed('bar', true)
            .attr('fill',d=>this.colorScale(d[0]));

        this.bars.transition().duration(anim)
            .attr('x', d=>this.scaleX(d[0]))
            .attr('width', this.scaleX.bandwidth())
            .attr('height', d=>this.scaleY(0)-this.scaleY(d[1]))
            .attr('y', d=>this.scaleY(d[1]));
        
        this.bars.selectAll('title')
            .data(d=>[d])
            .join('title')
            .text(d=>{
                const ftext=d[0].replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
                return `${ftext}: ${this.axisYFormat(d[1])}`});
    
        this.#updateEvents();
    }

    #updateEvents(){
        this.bars.on('mouseover', this.barHover)
            .on('mouseout', this.barOut)
            .on('click', (e,d)=>{
                console.log('Bar clicked:',d);
                this.barClick(e,d);
            })
    }

    #updateColorScale(){
        this.colorScale= d3.scaleOrdinal()
        .domain(new Set(d3.map(this.data,d=>d[0]))) 
        .range(d3.schemeBlues[3]); 
    }
    // Public API

    // dataset should be in the format [[k,v],...]
    render(dataset){
        this.data = dataset;
        this.#updateColorScale();
        this.#updateScales();
        this.#updateBars();
        this.#updateAxes();
        return this;
    }

    setLabels(labelX='categories', labelY='values'){
        this.labelX.text(labelX);
        this.labelY.text(labelY);
        return this;
    }

}
