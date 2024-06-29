// simple function to add statistics to flex container
export default class Statistic {
    label;
    format;
    // Create div 
    constructor(container) {
        this.div = d3.select(container)
            .append('div')
            .classed('statistic-card', true)
        // create divs to hold text label and value
        this.value = this.div.append('div')
            .classed('value', true)
            .style('text-anchor', 'middle');

        this.label = this.div.append('div')
            .classed('label', true)
            .style('text-anchor', 'middle');
    }
    // add label to and value
    render(value, label) {
        this.value.text(value);
        this.label.text(label);
    }
}
