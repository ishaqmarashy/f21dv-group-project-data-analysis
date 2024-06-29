export default class ScatterPlotCombined {
    width; height; margin;
    svg; chart; dots; axisX; axisY; labelX; labelY;
    scaleX; scaleY; scaleSize; tooltip;
    data; colorScale; config;
    format;
  
    constructor(container, width, height, margin) {
      this.width = width;
      this.height = height;
      this.margin = margin;
      this.format = d3.format('.2f');
  
      this.svg = d3.select(container).append('svg')
        .classed('scatterPlot', true)
        .attr('viewBox', `0 0 ${this.width} ${this.height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .style('width', '95%')
        .style('height', 'auto');
  
      this.chart = this.svg.append('g')
        .attr('transform', `translate(${this.margin[3]},${this.margin[0]})`);
  
      this.dots = this.chart.selectAll('.dot');
      this.axisX = this.svg.append('g')
        .attr('transform', `translate(${this.margin[3]},${this.height - this.margin[1]})`);
  
      this.axisY = this.svg.append('g')
        .attr('transform', `translate(${this.margin[3]},${this.margin[0]})`);
  
      this.labelX = this.svg.append('text').classed('legend', true)
        .attr('transform', `translate(${this.width / 2},${this.height})`)
        .style('text-anchor', 'middle').attr('dy', -5);
  
      this.labelY = this.svg.append('text').classed('legend', true)
        .attr('transform', `translate(0,${this.height / 2})rotate(-90)`)
        .style('text-anchor', 'middle').attr('dy', 15);
  
      this.tooltip = d3.select(container)
        .append("div")
        .style("opacity", 0)
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background-color", "white")
        .style("border", "solid")
        .style("border-width", "1px")
        .style("border-radius", "5px")
        .style("padding", "10px");
  
        this.colorScale = d3.scaleOrdinal(d3.schemeBlues[9]);
    }
  
    setData(data) {
      this.data = data;
      return this;
    }
  
    updateScales(config) {
      let chartWidth = this.width - this.margin[3] - this.margin[1];
      let chartHeight = this.height - this.margin[0] - this.margin[2];
  
      // domain of the Y axis is 0 up to the maximum value of what is at index 0 of the data  
      let domainY = [0, d3.max(this.data, d => d[config.y])];

      let domainX = [0, 100];
      let domainSize = d3.extent(this.data, d => d[config.size]);

      // linearly increasing x and y axis scales  
      this.scaleX = d3.scaleLinear().domain(domainX).range([0, chartWidth]);
      this.scaleY = d3.scaleLinear().domain(domainY).range([chartHeight, 0]);
      this.scaleSize = d3.scaleLinear().domain(domainSize).range([5, 15]);
    }
  
    updateAxes() {
      let axisGenX = d3.axisBottom(this.scaleX);
      let axisGenY = d3.axisLeft(this.scaleY);
  
      this.axisX.call(axisGenX);
      this.axisY.call(axisGenY);
    }
  
    updateDots(config) {
        this.dots = this.chart.selectAll('.dot')
          .data(this.data)
          .join('circle')
          .attr('class', d => d.city)
          .classed('dot', true)
          .attr('cx', d => this.scaleX(d[config.x])) // plot the x-axis 
          .attr('cy', d => this.scaleY(d[config.y]))  // plot the y-axis 
          .attr('r', d => this.scaleSize(d[config.size])) // plot the radius as the price of the Airbnb so bigger the circle, the more expensive it is
          .attr('fill', d => this.colorScale(d.city)) // plot the color scale to identify by city
          .style("stroke", "black")
          .style("stroke-width", 0.1);
      
        this.dots.on("mouseover", (event, d) => {
          this.tooltip.transition()
            .duration(200)
            .style("opacity", 1);
          this.tooltip.html(`City: ${d.city}<br>
            ${config.y}: ${this.format(d[config.y])}<br>
            ${config.x}: ${this.format(d[config.x])}<br>
            ${config.size}: ${this.format(d[config.size])}`)
            .style("left", (event.pageX) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => {
          this.tooltip.transition()
            .duration(200)
            .style("opacity", 0);
        });
    }

    createColorLegend() {
      // Constants for legend sizing
      const legendRectSize = 8; // The size of the legend color squares
      const legendSpacing = 2;  // The spacing between legend items
      const legendXOffset = -50; // Adjust this to position your legend inside the chart area
      const legendYOffset = 25; // Adjust this to push the legend down vertically
  
      const uniqueCities = Array.from(new Set(this.data.map(d => d.city)));
  
      const legendColorScale = d3.scaleOrdinal()
          .domain(uniqueCities)
          .range(d3.schemeBlues[9]);
  
      const legend = this.chart.selectAll('.legend')
          .data(uniqueCities);
  
      legend.selectAll('rect')
          .attr('fill', d => legendColorScale(d));
  
      legend.selectAll('text')
          .text(d => d);
  
      const legendEnter = legend.enter()
          .append('g')
          .attr('class', 'legend')
          .attr('transform', (d, i) => `translate(${this.width - legendRectSize + legendXOffset},${i * (legendRectSize + legendSpacing) + legendYOffset})`);
  
      legendEnter.append('rect')
          .attr('width', legendRectSize)
          .attr('height', legendRectSize)
          .attr('fill', d => legendColorScale(d));
  
      legendEnter.append('text')
          .attr('x', -2) // Padding between rect and text
          .attr('y', legendRectSize/2 )
          .attr('dy', '0.35em') // Vertically center text
          .style('text-anchor', 'end')
          .style('font-size', '5px') // Smaller font size for the legend text
          .text(d => d);
  
      legend.exit().remove();
  }  
    
    render(config) {
      this.updateScales(config);
      this.updateDots(config);
      this.updateAxes();
      return this;
    }
  
    setLabels(labelX, labelY) {
      this.labelX.text(labelX);
      this.labelY.text(labelY);
      return this;
    }
  }
  