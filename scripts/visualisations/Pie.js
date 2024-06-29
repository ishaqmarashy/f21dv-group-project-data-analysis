// Code from lab is referenced and re-used to create pie map 
export default class Pie{

    // Object properties
    width; height; margin; size;
    svg; chart; arcs; labels;
    data; color;

    pieGenerator;

    // Constructor: setup size and selections
    // Parameters: selector, width, height, [top,bottom,left,right]margin
    constructor(container, width, height, margin){
        this.width = width;
        this.height = height;
        this.margin = margin;
        let innerWidth = this.width - this.margin[2] - this.margin[3],
            innerHeight = this.height - this.margin[0] - this.margin[1];
        this.svg = d3.select(container).append('svg')
            .classed('pie vis', true)
            .attr('viewBox', `0 0 ${this.width} ${this.height}`)
            .attr('preserveAspectRatio', 'xMidYMid meet') // This keeps the aspect ratio during scaling
            .style('width', '100%') // Make the SVG width responsive
            .style('height', 'auto'); // Adjust the height automatically based on the aspect ratio

        this.chart = this.svg.append('g')
            .attr('transform', `translate(${this.margin[2]+innerWidth/2},${this.margin[0]+innerHeight/2})`);
        this.arcs = this.chart.selectAll('path.arc');
        this.labels = this.chart.selectAll('text.label');

        // Create common data generator (not depending on data)
        // sort by key/label
        this.pieGenerator = d3.pie()
            .padAngle(0.02)
            .sort((a,b)=>d3.ascending(a[0],b[0]))
            .value(d=>d[1]);
        // Establish minimum fitting dimension
        this.size = Math.min(innerWidth,innerHeight);
    }

    // Private methods
    #updateColor(){
        const uniqueValues = new Set(d3.map(this.data,d => d.day_status));
        this.color = d3.scaleOrdinal()
        .domain(uniqueValues)
        .range(d3.schemeBlues[3]);
    }

    #updateArcs(){
        // Will interpolate arcs
        // Inspired by rshaker: https://jsfiddle.net/rshaker/rbmgacep
        // duration of transitions
        let dur = 500;
        // make arc generator
        let arcGen = d3.arc()
            .outerRadius(this.size/2-20)
            .innerRadius(this.size/30);
        // make arc interpolator function
        // returns a function of time, which provide the arc path at that time
        let arcInterpolator = function(d){
            let interpolate = d3.interpolate(this._d, d);
            return (t)=>{
                this._d = interpolate(t);
                return arcGen(this._d)
            }
        }
        // query old data, returns exisiting data if it's the first render
        let oldData = this.arcs.empty()?this.data:this.arcs.data().map(d=>d.data);
        // make two addtional sets of sparse data
        // so that new arcs start with value 0 and old arcs finish with value 0
        let was = this.#mergeData(this.data, oldData),
            is = this.#mergeData(oldData, this.data);

        // rerender arcs
        this.arcs = this.arcs
            // bind and join sparse old data (new elements in with value 0)
            .data(this.pieGenerator(was),d=>d.data[0])
            .join(
                // create new arcs, with value 0
                enter => enter.insert('path')
                .classed('arc',true)
                .attr('fill', d=> this.color(d.data[0]))
                .each(function(d){this._d=d}),
                update=>update,
                exit=>exit
            )
            // bind and join sparse new data (old elements kept with value 0)
            .data(this.pieGenerator(is), d=>d.data[0])
            .join(
                enter=>enter,
                // interpolate new and old arcs
                update=>update.transition().duration(dur).attrTween('d', arcInterpolator),
                exit=>exit
            )
            // bind and join final data (only new elements)
            .data(this.pieGenerator(this.data), d=>d.data[0])
            .join(
                enter=>enter,
                update=>update,
                // destroy old arcs (after interpolation is finished)
                exit=>exit.transition().duration(0).delay(dur).remove()
            )
    }

    #updateLabels(){
        // Same as arcs, but this time interpolates labels
        // label format
        let format = d3.format('.1%');
        // duration of transition
        let dur = 500;
        // make arc generator for label position
        let labelArcGen = d3.arc()
            .innerRadius(this.size/2-20)
            .outerRadius(this.size/2);
        // get total value to calculate percentages

        let sum = d3.sum(this.data, d=>d[1]);
        // make arc interpolator for label position
        let labelInterpolator = function(d){
            let interpolate = d3.interpolate(this._d, d);
            return (t)=>{
                this._d = interpolate(t);
                return `translate(${labelArcGen.centroid(this._d)})`
            }
        }
        // make interpolator for label alignment
        let anchorInterpolator = function(d){
            let interpolate = d3.interpolate(this._d, d);
            return (t)=>{
                this._d = interpolate(t);
                return this._d.startAngle+(this._d.endAngle-this._d.startAngle)/2>3.14?'end':'start'
            }
        }
        // make interpolator for text
        let textInterpolator = function(d){
            let interpolate = d3.interpolate(this._d, d);
            return (t)=>{
                this._d = interpolate(t);
                return `${this._d.data[0]}: ${format(this._d.value/sum)}`
            }
        }
        // query old data, returns exisiting data if it's the first render
        let oldData = this.labels.empty()?this.data:this.labels.data().map(d=>d.data);
        // make two addtional sets of sparse data
        // so that new arcs start with value 0 and old arcs finish with value 0
        let was = this.#mergeData(this.data, oldData),
            is = this.#mergeData(oldData, this.data);

        // rerender labels
        this.labels = this.labels
            // bind and join sparse old data (new elements in with value 0)
            .data(this.pieGenerator(was),d=>d.data[0])
            .join(
                // create new text elelments
                enter => enter.insert('text').classed('label',true).each(function(d){this._d=d})
                    .attr('font-family','sans-serif')
                    // .attr('font-size', 10)
                    .attr('transform', d=>`translate(${labelArcGen.centroid(d)})`)
                    .attr('text-anchor', d=>d.startAngle+(d.endAngle-d.startAngle)>3.14?'end':'start')
                    .style('opacity', 0)
                    .text(d=>`${d.data[0]} - ${format(d.data[1]/this.sum)}`),
                update=>update,
                exit=>exit
            )
            // bind and join sparse new data (old elements kept with value 0)
            .data(this.pieGenerator(is), d=>d.data[0])
            .join(
                enter=>enter,
                // update labels' position alignment and text with interpolators
                update=>update.transition().duration(dur)
                    .attrTween('transform', labelInterpolator)
                    .style('opacity', 1)
                    .attrTween('text-anchor', anchorInterpolator)
                    .textTween(textInterpolator),
                exit=>exit
            )
            // bind and join final data (only new elements)
            .data(this.pieGenerator(this.data), d=>d.data[0])
            .join(
                enter=>enter,
                update=>update,
                // remove old labels
                exit=>exit.transition().duration(dur)
                    .style('opacity', 0)
                    .duration(0).delay(dur).remove()
            )
            .text(d=>`${d.data[0]} - ${format(d.data[1]/this.sum)}`)
    }

    // Creates a merged sparse dataset between old and new
    // old items not in the new set are set to 0
    #mergeData(dataA, dataB){
        let keySetB = new Set(dataB.map(d=>d[0]));
        let zeroesA = dataA.filter(d=>!keySetB.has(d[0]))
            .map(d=>[d[0],0]);
        let merged = dataB.concat(zeroesA).sort((a,b)=>d3.ascending(a[0],b[0]));
        return merged;
    }

    // Public API
    // dataset should be in the format [[k,v],...]
    render(dataset){
        this.data = dataset;
        this.#updateColor();
        this.#updateArcs();
        this.#updateLabels();
        return this;
    }
}